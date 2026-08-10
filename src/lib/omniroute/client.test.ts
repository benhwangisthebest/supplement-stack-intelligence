// Unit tests for the one paid client (Phase 2 U25).
//
// No network: `fetchImpl` is injected everywhere. The timeout tests drive fake
// timers, which is the whole reason the timeout was reimplemented rather than
// delegated to an SDK option — see finding N-20.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COMPLETIONS_PATH,
  createCompletion,
  completionsUrl,
  DEFAULT_TIMEOUT_MS,
  OmnirouteError,
  parseCompletion,
  readUsage,
} from "./client";

const CONFIG = { baseUrl: "https://gw.example", apiKey: "k" };
const REQ = {
  model: "m",
  messages: [{ role: "user" as const, content: "hi" }],
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

const ANSWER = {
  choices: [{ message: { content: "hello", tool_calls: [] } }],
  usage: { prompt_tokens: 12, completion_tokens: 8 },
};

describe("pure cores", () => {
  it("completionsUrl joins base and path, tolerating a trailing slash", () => {
    expect(completionsUrl("https://gw.example")).toBe(
      `https://gw.example${COMPLETIONS_PATH}`,
    );
    expect(completionsUrl("https://gw.example///")).toBe(
      `https://gw.example${COMPLETIONS_PATH}`,
    );
  });

  it("readUsage maps prompt/completion tokens", () => {
    expect(readUsage({ prompt_tokens: 3, completion_tokens: 4 })).toEqual({
      inputTokens: 3,
      outputTokens: 4,
    });
  });

  it.each([
    ["an absent usage object", undefined],
    ["a null usage object", null],
    ["a non-object", 7],
    ["only prompt_tokens", { prompt_tokens: 3 }],
    ["only completion_tokens", { completion_tokens: 4 }],
    ["a non-numeric field", { prompt_tokens: "3", completion_tokens: 4 }],
    ["a non-finite field", { prompt_tokens: Number.NaN, completion_tokens: 4 }],
  ])("readUsage returns null (NOT zero) for %s", (_label, raw) => {
    // The distinction the whole ledger rests on. `?? 0` here would settle a
    // paid turn to nothing and hand the reservation back.
    expect(readUsage(raw)).toBeNull();
  });

  it("parseCompletion reads text and usage", () => {
    expect(parseCompletion(ANSWER)).toEqual({
      text: "hello",
      toolCalls: [],
      usage: { inputTokens: 12, outputTokens: 8 },
    });
  });

  it("parseCompletion keeps tool arguments as a RAW JSON string", () => {
    const out = parseCompletion({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: { name: "checkInteractions", arguments: '{"a":1}' },
              },
            ],
          },
        },
      ],
    });
    expect(out.text).toBe("");
    expect(out.toolCalls).toEqual([
      { id: "call_1", name: "checkInteractions", argumentsJson: '{"a":1}' },
    ]);
    // No usage object on this response → unreported, not zero.
    expect(out.usage).toBeNull();
  });

  it("parseCompletion drops a tool call missing an id or a name", () => {
    const out = parseCompletion({
      choices: [
        {
          message: {
            content: "",
            tool_calls: [
              { id: "", type: "function", function: { name: "x", arguments: "{}" } },
              { id: "call_2", type: "function", function: { arguments: "{}" } },
            ],
          },
        },
      ],
    });
    expect(out.toolCalls).toEqual([]);
  });

  it.each([
    ["an empty body", {}],
    ["no choices", { choices: [] }],
    ["a choice with no message", { choices: [{}] }],
  ])("parseCompletion throws a malformed OmnirouteError for %s", (_l, body) => {
    expect(() => parseCompletion(body)).toThrow(OmnirouteError);
    expect(() => parseCompletion(body)).toThrow(/no choice message/);
  });
});

describe("createCompletion — the request it puts on the wire", () => {
  it("posts to the completions URL with a bearer key and stream:false", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(ANSWER));

    await createCompletion({ ...CONFIG, fetchImpl: fetchImpl as never }, REQ);

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://gw.example${COMPLETIONS_PATH}`);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer k");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("m");
    expect(body.stream).toBe(false);
  });

  it("omits tools entirely when none are supplied", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(ANSWER));

    await createCompletion({ ...CONFIG, fetchImpl: fetchImpl as never }, REQ);

    const body = JSON.parse(
      (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
    );
    expect(body).not.toHaveProperty("tools");
    expect(body).not.toHaveProperty("tool_choice");
  });

  it("sends tools with tool_choice:auto when supplied", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(ANSWER));

    await createCompletion(
      { ...CONFIG, fetchImpl: fetchImpl as never },
      {
        ...REQ,
        maxTokens: 1024,
        tools: [
          {
            type: "function",
            function: { name: "t", description: "d", parameters: {} },
          },
        ],
      },
    );

    const body = JSON.parse(
      (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
    );
    expect(body.tools).toHaveLength(1);
    expect(body.tool_choice).toBe("auto");
    expect(body.max_tokens).toBe(1024);
  });
});

describe("createCompletion — failure paths disclose nothing", () => {
  it("throws an http OmnirouteError carrying the status and NOT the body", async () => {
    const json = vi.fn(async () => ({ error: "invalid api key sk-SECRET" }));
    const fetchImpl = vi.fn(
      async () => ({ ok: false, status: 401, json }) as unknown as Response,
    );

    const promise = createCompletion({ ...CONFIG, fetchImpl: fetchImpl as never }, REQ);

    await expect(promise).rejects.toMatchObject({ kind: "http", status: 401 });
    await expect(promise).rejects.toThrow(/status 401/);
    // The body was never read, so there is nothing to leak downstream.
    expect(json).not.toHaveBeenCalled();
  });

  it("rethrows a transport failure unchanged when it is not a timeout", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });

    await expect(
      createCompletion({ ...CONFIG, fetchImpl: fetchImpl as never }, REQ),
    ).rejects.toBeInstanceOf(TypeError);
  });
});

describe("createCompletion — the timeout (N-20's first red proof)", () => {
  afterEach(() => vi.useRealTimers());

  /** A fetch that never settles on its own; it only rejects when aborted. */
  const hangingFetch = vi.fn(
    (_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      }),
  );

  it("aborts the request and throws a timeout error at the deadline", async () => {
    vi.useFakeTimers();

    const promise = createCompletion(
      { ...CONFIG, timeoutMs: 1000, fetchImpl: hangingFetch as never },
      REQ,
    );
    const assertion = expect(promise).rejects.toMatchObject({ kind: "timeout" });

    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });

  it("defaults to the 60s ceiling the SDK option used to carry", async () => {
    vi.useFakeTimers();

    const promise = createCompletion(
      { ...CONFIG, fetchImpl: hangingFetch as never },
      REQ,
    );
    const assertion = expect(promise).rejects.toThrow(
      new RegExp(`timed out after ${DEFAULT_TIMEOUT_MS}ms`),
    );

    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS);
    await assertion;
  });

  it("forwards the caller's abort — a disconnect stops an in-flight call", async () => {
    const caller = new AbortController();
    const promise = createCompletion(
      { ...CONFIG, signal: caller.signal, fetchImpl: hangingFetch as never },
      REQ,
    );

    caller.abort();

    // Not a timeout: the caller went away, so the transport failure is rethrown
    // unchanged rather than relabelled as a deadline we did not hit.
    await expect(promise).rejects.toThrow(/Aborted/);
  });

  it("does not call fetch at all when the caller has already disconnected", async () => {
    // Written as a hanging fake deliberately: if the client ever stops
    // short-circuiting, this does NOT quietly pass on `fetch`'s own rejection —
    // the fake never settles and the test reddens by timing out. A fake that
    // rejected on a pre-aborted signal would make the short-circuit untestable.
    const caller = new AbortController();
    caller.abort();
    const fetchImpl = vi.fn(
      (_u: string, init: RequestInit) =>
        new Promise<Response>((_res, rej) =>
          init.signal?.addEventListener("abort", () => rej(new Error("Aborted"))),
        ),
    );

    await expect(
      createCompletion(
        { ...CONFIG, signal: caller.signal, fetchImpl: fetchImpl as never },
        REQ,
      ),
    ).rejects.toMatchObject({ kind: "aborted" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
