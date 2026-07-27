export function logWorkerEvent(
  event: string,
  payload: Record<string, unknown> & { workerId: string },
) {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      service: "crosspost-worker",
      event,
      ...payload,
    }),
  );
}
