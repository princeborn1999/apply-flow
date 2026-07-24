import type { Metadata } from "next";
import ApplyFlowApp from "../src/ApplyFlowApp";

export const metadata: Metadata = {
  title: "ApplyFlow — Job application tracker",
  description: "Track applications, follow-ups, and outcomes in one focused workspace.",
};

export default function Home() {
  return <ApplyFlowApp />;
}
