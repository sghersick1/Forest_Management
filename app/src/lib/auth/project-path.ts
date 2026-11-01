const projectChild = /^\/projects\/[^/]+(?:\/[^/]+)*\/?$/;

/** True for /projects/[projectId] and every path under it. */
export function isProjectChildPath(pathname: string): boolean {
  return projectChild.test(pathname);
}

/** A same-app project path, or /projects when the value is not one. */
export function safeProjectNext(value: string): string {
  if (
    value.includes("\\") ||
    value.includes("//") ||
    value.includes("://") ||
    value.split("/").includes("..") ||
    !isProjectChildPath(value)
  ) {
    return "/projects";
  }

  return value;
}
