import { ProjectAccess } from "@/app/components/access-controls/project-access";

export default function ProjectLayout({
  children,
  params,
}: LayoutProps<"/projects/[projectId]">) {
  return <ProjectAccess params={params}>{children}</ProjectAccess>;
}
