// @ts-nocheck — template overlay; this line is stripped when `pnpm flavor apply` copies the file into place
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useTheme } from "@/components/theme-provider";

function Toaster({ ...props }: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return <Sonner theme={resolvedTheme} {...props} />;
}

export { Toaster };
