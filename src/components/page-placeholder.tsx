import { ConstructionIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PagePlaceholderProps = {
  title: string;
  description: string;
  milestone: string;
};

export function PagePlaceholder({
  title,
  description,
  milestone,
}: PagePlaceholderProps) {
  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <span className="mb-1 flex size-10 items-center justify-center rounded-lg bg-muted">
          <ConstructionIcon className="size-5 text-muted-foreground" />
        </span>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Esta área entra em funcionamento na milestone{" "}
          <span className="font-medium text-foreground">{milestone}</span>.
        </p>
      </CardContent>
    </Card>
  );
}
