import { api } from "@/services/api";

export const pushSubscribeMutation = async (
  subscription: PushSubscriptionJSON,
) => {
  await api.post("/push/subscribe", {
    endpoint: subscription.endpoint,
    keys: subscription.keys,
  });
};
