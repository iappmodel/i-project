import { createICommandEvent } from "./i-command-events";
import { parseICommand } from "./i-command-parser";
import { routeICommand } from "./i-command-router";

import type { ICommandEngineResult, ICommandInput } from "./i-command.types";

export function runICommand(input: ICommandInput): ICommandEngineResult {
  const parse = parseICommand(input.raw);
  const route = routeICommand(parse);

  const event = createICommandEvent({
    userId: input.userId,
    parse,
    route,
  });

  console.log("[i-command:event]", event);

  return {
    parse,
    route,
    event,
  };
}
