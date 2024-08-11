import type { Context } from "@actions/github/lib/context";
import type { GitHub } from "@actions/github/lib/utils";

const labelMapping: { [key: string]: string } = {
  feat: "Type: Feature",
  fix: "Type: Bug",
  docs: "Type: Documentation",
  refactor: "Type: Refactoring",
  perf: "Type: Performance",
  deps: "Type: Dependencies",
  ci: "Type: CI",
  chore: "Type: Chore",
};

interface AddPrLabelParams {
  context: Context;
  github: InstanceType<typeof GitHub>;
  branch: string;
}

export const addPrLabel = async ({
  context,
  github,
  branch,
}: AddPrLabelParams): Promise<void> => {
  if (!branch || !context || !github) {
    console.error("Missing required parameters.");
    return;
  }

  const { owner, repo } = context.repo;
  const { number } = context.issue;
  const prefix = branch.split("/")[0];
  const label = labelMapping[prefix];

  if (label) {
    try {
      await github.rest.issues.addLabels({
        owner,
        repo,
        issue_number: number,
        labels: [label],
      });
      console.log(`Label '${label}' added to PR #${number}`);
    } catch (error) {
      console.error(
        `Failed to add label: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  } else {
    console.log(`No matching label found for branch prefix '${prefix}'`);
  }
};
