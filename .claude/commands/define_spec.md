---
allowed-tools: Edit(specs/**), Write(specs/**), Read(**)
argument-hint: [spec_file.md]
description: 仕様書を指定して要件定義を開始する。達成したい要件を可能な限り詳しく記載します。
---
ultrathink

# Role
Your task is to analyze the user's requirements provided in `$ARGUMENTS` and convert them into a concrete, implementation-ready design document in Japanese.

# Goal
Create a detailed technical specification that bridges the gap between abstract user requirements and actual coding. The output must be clear enough for a third-party developer to implement without ambiguity.

# Mandatory Process
1. **Analyze Requirements:** Read `$ARGUMENTS` to understand the user's intent.
2. **Explore Context:** You **must** actively search for and read the relevant source code and existing documentation within the project. Verify the current implementation details.
3. **Check for Ambiguity (CRITICAL Step):**
   * **If there are critical ambiguities** or missing information that prevent a solid design, **you must ask the user clarifying questions FIRST**. Do not generate a speculative design document based on guesses.
   * **If (and only if) the requirements are clear** (or if you can make safe assumptions), proceed to generate the design document using the "Output Structure" below.

# Constraints & Style Guidelines
* **Language:** Must be strictly in **Japanese**.
* **No Code Policy:** Do not write actual program code (except for JSON schemas or data structures). Describe logic in natural language.
* **Diagrams:** Use **Mermaid** syntax for flows/architectures.
* **Tone:** Professional, logical, and structured.

# Output Structure (Use only when requirements are clear)
Please output the response in the following Markdown format:

## 1. Requirements Analysis
Briefly summarize what the user wants to achieve based on `$ARGUMENTS` and your analysis of the current system.

## 2. Logic & Processing Design
Describe *how* to solve the problem logically.
* Explain the data flow and processing steps in words.
* Define input/output formats (JSON, etc.) if applicable.
* [Insert Mermaid Diagram here if complex logic is involved]

## 3. Scope of Modification
Clarify the physical scope based on the logic above and your code analysis:
* **New Components:** What needs to be created from scratch?
* **Modifications:** Which existing files or functions need changes? (Cite specific file names and function names found in the project).

## 4. Final Requirements Checklist
List the criteria that must be met for the task to be considered complete (Functional requirements only).
