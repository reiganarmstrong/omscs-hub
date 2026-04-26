import { notFound } from "next/navigation";
import { COURSES, COURSES_BY_ID } from "@/lib/data";
import { CourseDetail } from "@/components/courses/course-detail";

export function generateStaticParams() {
  return COURSES.map((c) => ({ id: c.id }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const course = COURSES_BY_ID[id];
  if (!course) notFound();
  return <CourseDetail course={course} />;
}
