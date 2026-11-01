# Project Management Plan (PMP)

*AI-Assisted Child Development Platform*

## PMP-1. Project and Team

### Project and Jira Setup

**Project in one sentence:** Lumi is an AI-assisted web platform that enables parents and specialists to collaborate in tracking children’s development through shared schedules, tasks, observations and documents.

**Jira project key:** KAN

**Jira board link:** https://seng383.atlassian.net/jira/software/projects/KAN/boards/1

### Team and Roles

| Name | Jira / GitHub username | Role |
|---|---|---|
| Halil İbrahim Koçak | Jira: halilibrhmkocak@gmail.com<br>GitHub: halilkocakk | Full-stack Developer |
| Özge Yuva | Jira: ozge.yuva5@gmail.com<br>GitHub: ozgeyuva | Full-stack Developer |
| Hanzade Coşan | Jira: hanzadecosan1@gmail.com<br>GitHub: hanzadecosan | Full-stack Developer |

---

## PMP-2. Plan

### Work Packages (Epics)

| Epic | Owner | Number of tasks | Planned sprint(s) |
|---|---|---|---|
| M1 - Registration, Login and Roles | | | Sprint 1 (Basic MVP), Sprint 2 (Completion) |
| M2 - Access Permissions | | | SPRINT 2 |
| M3 - Weekly Schedule | | | SPRINT 2 |
| M4 - Tasks | | | Sprint 1 (Basic MVP), Sprint 2 (Completion) |
| M5 - Specialist Entries | | | SPRINT 3 |
| M6 - Documents | | | SPRINT 3 |
| M7 - Weekly Statistics | | | SPRINT 3 |
| M8 - Role-Based AI Summary | | | SPRINT 3-4 |

### Sprint Plan

| Sprint | Weeks | Sprint goal | Ends with |
|---|---|---|---|
| SPRINT 1 | WEEKS 3-6 | Establish the React frontend, Express backend, and SQLite database. Develop an initial working MVP featuring basic user authentication, parent-child linking, and task creation and assignment. Integrate the core components and validate the primary user flow. | Working MVP (v0.1), Week 6 |
| SPRINT 2 | WEEKS 7-8/9 | Complete and test M1-M4: registration, login, roles, specialist linking, weekly schedules and task management. Run the first end-to-end test in CI. | Release v0.2, mid-term |
| SPRINT 3 | AFTER 10. WEEK | Complete M5-M8: specialist entries, document management, weekly statistics and role-based AI summaries. Reach at least 40% branch coverage and implement end-to-end tests for three critical flows. | Release v0.3, Week 10 |
| SPRINT 4 | WEEKS 11-12 | Resolve remaining defects, complete integration and access-control testing, reach at least 60% branch coverage, and run an end-to-end test for each module M1-M8. Finalize documentation and prepare the demonstration. | Release v1.0, Week 12 (FINAL) |