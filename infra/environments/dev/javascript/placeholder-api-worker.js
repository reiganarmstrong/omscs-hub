export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: "omscs-hub-review-api-placeholder",
        placeholder: true,
      });
    }

    return Response.json(
      {
        error: "OMSCS Hub API placeholder. Deploy api/ with Wrangler.",
      },
      {
        status: 503,
      },
    );
  },
};
