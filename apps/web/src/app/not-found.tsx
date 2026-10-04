import { NotFoundIcon } from "@/components/ui/icons";
import { EmptyState, Page } from "@/components/ui/Page";
import { ButtonLink } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <Page>
      <EmptyState icon={<NotFoundIcon />} title="Nothing here">
        <p>This onboarding or page doesn&apos;t exist.</p>
        <div style={{ marginTop: 16 }}>
          <ButtonLink href="/">Back to overview</ButtonLink>
        </div>
      </EmptyState>
    </Page>
  );
}
