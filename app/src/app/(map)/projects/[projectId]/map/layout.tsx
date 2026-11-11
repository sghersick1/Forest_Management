/*
 * Project routes that require the caller to belong to the project.
 */

import { ProjectAccess } from "@/app/components/access-controls/project-access";

// Wraps the project page in the membership check.
export default function ProjectLayout({
  children,
  params,
}: LayoutProps<"/projects/[projectId]">) {
  return <ProjectAccess params={params}>{children}</ProjectAccess>;
}
