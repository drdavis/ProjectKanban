import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {title: "ProjectKanban", description: "Product development and bug tracking"};
export default function Layout({children}: {children: React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
