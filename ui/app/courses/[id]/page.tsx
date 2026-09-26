import { notFound, redirect } from "next/navigation";
import {
  COURSES,
  COURSES_BY_ID,
  COURSE_ALIASES,
  canonicalCourseId,
} from "@/lib/data";
import { CourseDetail } from "@/components/courses/course-detail";

export function generateStaticParams() {
  return [
    ...COURSES.map((c) => ({ id: c.id })),
    ...Object.keys(COURSE_ALIASES).map((id) => ({ id })),
  ];
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const canonical = canonicalCourseId(id);
  const course = COURSES_BY_ID[canonical];
  if (!course) notFound();
  if (id !== canonical) redirect(`/courses/${canonical}`);
  return <CourseDetail course={course} />;
}
