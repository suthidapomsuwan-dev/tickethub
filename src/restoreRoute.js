const routeQuery = new URLSearchParams(window.location.search);
const restoredPath = routeQuery.get("p");

if (restoredPath !== null) {
  const search = routeQuery.get("q") || "";
  const route = restoredPath.startsWith("/")
    ? restoredPath.slice(1)
    : restoredPath;

  window.history.replaceState(
    null,
    "",
    `${import.meta.env.BASE_URL}${route}${search}${window.location.hash}`
  );
}
