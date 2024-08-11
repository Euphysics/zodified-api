"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReleasePrBody = void 0;
const createReleasePrBody = async ({ context, github, base = "main" }) => {
  if (!context || !github) {
    console.error("Missing required parameters.");
    return;
  }
  const { owner, repo } = context.repo;
  try {
    const mergedPrs = await getMergedPulls(github, owner, repo, base);
    const changeLogs = mergedPrs
      .map((pr) => `- #${pr.number} by @${pr.user.login}`)
      .join("\n");
    const body = `## Change logs\n${changeLogs}`;
    return body;
  } catch (error) {
    console.error(
      `Failed to create PR body: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
exports.createReleasePrBody = createReleasePrBody;
/**
 * Get a list of merged pull requests to be included in the release.
 */
const getMergedPulls = async (github, owner, repo, base) => {
  try {
    const tags = await github.rest.repos.listTags({ owner, repo });
    let head;
    if (tags.data.length > 0) {
      head = tags.data[0].name;
    } else {
      const commits = await github.rest.repos.listCommits({
        owner,
        repo,
        per_page: 1,
        direction: "asc",
      });
      head = commits.data[0].sha;
    }
    const commitComparison = await github.rest.repos.compareCommits({
      owner,
      repo,
      base: head,
      head: base,
    });
    const mergedCommitShaList = commitComparison.data.commits
      .filter((commit) => commit.parents.length > 1)
      .map((commit) => commit.sha);
    const pulls = await github.rest.pulls.list({
      owner,
      repo,
      state: "closed",
      base,
      sort: "updated",
      direction: "desc",
    });
    const mergedPulls = pulls.data
      .filter(
        (pr) =>
          pr.merge_commit_sha &&
          mergedCommitShaList.includes(pr.merge_commit_sha) &&
          pr.user !== null,
      )
      .map((pr) => ({
        number: pr.number,
        // biome-ignore lint/style/noNonNullAssertion: user is guaranteed to be non-null
        user: { login: pr.user.login }, // Non-null assertion operator to ensure `user` is not null
        // biome-ignore lint/style/noNonNullAssertion: merge_commit_sha is guaranteed to be non-null
        merge_commit_sha: pr.merge_commit_sha,
      }));
    return mergedPulls;
  } catch (error) {
    console.error(
      `Failed to retrieve merged PRs: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    throw error;
  }
};
