export default {
  async fetch() {
    return new Response("OMSCS Hub UI placeholder. Deploy ui/ with Wrangler.", {
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    });
  },
};
