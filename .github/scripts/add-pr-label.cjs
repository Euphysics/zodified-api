"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPrLabel = void 0;
const labelMapping = {
  feat: "Type: Feature",
  fix: "Type: Bug",
  docs: "Type: Documentation",
  refactor: "Type: Refactoring",
  perf: "Type: Performance",
  deps: "Type: Dependencies",
  ci: "Type: CI",
  chore: "Type: Chore",
};
const addPrLabel = async ({ context, github, branch }) => {
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
exports.addPrLabel = addPrLabel;
