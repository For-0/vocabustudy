module.exports = {
    "dataSource": "issues",
    "prefix": "v",
    "ignoreLabels": ["good first issue", "help wanted"],
    "ignoreIssuesWith": ["bug", "cannot reproduce", "documentation", "duplicate", "invalid", "question", "wontfix"],
    "onlyMilestones": true,
    "groupBy": {
        "Bugs Fixed": ["bug"],
        "New Features": ["enhancement"]
    },
    "changelogFilename": "CHANGELOG.md"
}