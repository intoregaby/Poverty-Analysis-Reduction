// The one interface between a telephone network and the USSD logic.
//   gateway.parse(request)  -> { sessionRef, phone, input, source }   what the network sent, in our terms
//   gateway.format(reply)   -> Response body / object for the network  what we send back
// The logic in core.js never sees a network format. To connect a real operator, write another adapter here.

// The code people dial to reach the service. The operator assigns the real one; this is the demo code.
export const SERVICE_CODE = "*384#";

// Demo simulator: JSON { sessionRef, phone, input }, answers JSON { text, end }.
export const SimulatorGateway = {
  name: "simulator",
  parse: (body) => ({ sessionRef: String(body.sessionRef || ""), phone: normalizePhone(body.phone), input: String(body.input ?? ""), source: "simulator" }),
  format: (reply) => ({ json: { text: reply.text, end: reply.end } }),
};

// Africa's Talking (to be confirmed with the operator). It posts form fields sessionId, phoneNumber, text, and expects
// plain text that starts with CON (continue) or END (finish). `text` holds every answer so far, joined by "*".
export const AfricasTalkingGateway = {
  name: "africastalking",
  parse: (fields) => {
    const steps = String(fields.text || "").split("*").filter((part) => part !== "");
    return { sessionRef: String(fields.sessionId || ""), phone: normalizePhone(fields.phoneNumber), input: steps.length ? steps[steps.length - 1] : "", source: "gateway" };
  },
  format: (reply) => ({ text: `${reply.end ? "END" : "CON"} ${reply.text}` }),
};

export function normalizePhone(value) {
  const digits = String(value || "").replace(/[^\d+]/g, "");
  if (/^\+250\d{9}$/.test(digits)) return digits;
  if (/^250\d{9}$/.test(digits)) return `+${digits}`;
  if (/^0\d{9}$/.test(digits)) return `+250${digits.slice(1)}`;
  return digits;
}

export const GATEWAYS = { simulator: SimulatorGateway, africastalking: AfricasTalkingGateway };
