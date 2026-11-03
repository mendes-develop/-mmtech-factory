# -mmtech-factory

## Software factory

This repo holds the infrastructure and automation for agent-driven changes.
Agents propose every change as a draft pull request for human review.
Agent instructions live in `CLAUDE.md`. The workflow that runs agents is in `.github/workflows/agent.yml`.

## Run tracking

Every agent run is recorded in the MongoDB collection `software_factory.agent_runs`.
