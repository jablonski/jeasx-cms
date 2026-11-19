import { configureCms } from "@cms/configure";
import type { RouteProps, ThisContext } from "@cms/core/types";
import config from "./cms.config";

configureCms(config);

export default function (this: ThisContext, { request, reply }: RouteProps) {
  this.request = request;
  this.reply = reply;
}
