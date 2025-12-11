/**
 * Transform prompts for document restructuring
 * These are stored separately in the backend and only included when selected
 * to optimize token usage.
 */

export type TransformType = "pyramid" | "coin" | "developer" | "business" | "management" | "cosmos" | "cringe";

/**
 * Pyramid Principle (Minto) transform prompt
 */
export const PYRAMID_PROMPT = `# PYRAMID - Minto Pyramid Principle Document Transformer

## CRITICAL RULE:
**TRANSFORM THE ENTIRE NOTE. NO POINTS LEFT BEHIND. NO QUESTIONS.**

When you receive a document:
1. READ the entire note content
2. EXTRACT all information points
3. IDENTIFY the main conclusion/answer
4. GROUP supporting arguments logically
5. ORGANIZE evidence under each argument
6. OUTPUT the restructured document
7. VERIFY nothing was dropped

---

## PHASE 1: CONTENT EXTRACTION

Before restructuring, extract ALL content from the note:

### Step 1.1: Identify Content Types
Scan for and catalog:

| Content Type | Pattern | Example |
|--------------|---------|---------|
| Main Claim | "The point is...", "In summary...", conclusion sentences | "We should adopt microservices" |
| Sub-Claims | "because", "since", "therefore" | "because it improves scalability" |
| Evidence | Numbers, data, statistics, facts | "40% faster deployment" |
| Examples | "for example", "such as", case studies | "Netflix uses this approach" |
| Comparisons | "better than", "versus", "compared to" | "faster than monolithic" |
| Concerns/Risks | "however", "but", "risk", "challenge" | "but requires more DevOps skill" |
| Recommendations | "should", "must", "recommend" | "should start with pilot project" |
| Questions | Unanswered items, unknowns | "need to determine timeline" |
| References | Links, citations, sources | "[Source: AWS whitepaper]" |
| Action Items | Tasks, next steps, to-dos | "set up POC by Q2" |

### Step 1.2: Content Inventory
Create mental inventory:
- Total distinct points: [count]
- Main themes identified: [list]
- Orphan facts (no clear category): [list]

**⚠️ CRITICAL: Every item in this inventory MUST appear in final output**

---

## PHASE 2: PYRAMID STRUCTURE RULES

### The Minto Pyramid Principle:

\`\`\`
                    ┌─────────────────┐
                    │   KEY MESSAGE   │  ← Answer/Conclusion FIRST
                    │   (The Point)   │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼────┐         ┌────▼────┐         ┌────▼────┐
    │ Argument │         │ Argument │         │ Argument │  ← WHY? Supporting reasons
    │    1     │         │    2     │         │    3     │     (3-5 max)
    └────┬─────┘         └────┬─────┘         └────┬─────┘
         │                    │                    │
    ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
    │Evidence │          │Evidence │          │Evidence │  ← HOW? Data & proof
    │Examples │          │Examples │          │Examples │
    │Details  │          │Details  │          │Details  │
    └─────────┘          └─────────┘          └─────────┘
\`\`\`

### Grouping Logic (MECE Principle):
- **M**utually **E**xclusive: No overlap between argument groups
- **C**ollectively **E**xhaustive: All points covered, nothing missing

### Grouping Strategies:
| Strategy | Use When | Example |
|----------|----------|---------|
| **Chronological** | Process, timeline, history | Phase 1 → Phase 2 → Phase 3 |
| **Structural** | Components, parts | Frontend, Backend, Database |
| **Priority** | Ranked items | Critical → Important → Nice-to-have |
| **Comparison** | Options, alternatives | Option A vs Option B vs Option C |
| **Problem-Solution** | Issues & fixes | Challenge → Approach → Result |
| **Stakeholder** | Different audiences | Business, Technical, Operations |

---

## PHASE 3: OUTPUT FORMAT (STRICT)

### Document Structure:

\`\`\`markdown
## 🎯 Key Message
[One clear sentence stating the main conclusion/answer/recommendation]

**In brief:** [2-3 sentence summary that answers: What? So what? Now what?]

---

## 📌 Supporting Arguments

### Argument 1: [Clear argument title]
[Explanation paragraph]

**Evidence:**
- [Data point/fact/example 1]
- [Data point/fact/example 2]
- [Data point/fact/example 3]

---

### Argument 2: [Clear argument title]
[Explanation paragraph]

**Evidence:**
- [Data point/fact/example 1]
- [Data point/fact/example 2]

---

### Argument 3: [Clear argument title]
[Explanation paragraph]

**Evidence:**
- [Data point/fact/example 1]
- [Data point/fact/example 2]

---

## ⚠️ Considerations & Risks
[Any concerns, challenges, or caveats from original document]
- [Risk/concern 1]
- [Risk/concern 2]

---

## ✅ Action Items & Next Steps
[Any tasks or recommendations from original document]
- [ ] [Action item 1]
- [ ] [Action item 2]

---

## 📎 References & Sources
[Any links, citations, or sources from original document]
- [Reference 1]
- [Reference 2]

---

## 📋 Completeness Check
**Original points captured:** [X/X] ✅
**Grouping strategy used:** [Which strategy from Phase 2]
\`\`\`

---

## PHASE 4: TRANSFORMATION RULES

### ALWAYS:
✅ Put the CONCLUSION first (even if it was at the end in original)
✅ Group related points under clear argument headings
✅ Include ALL data points from original
✅ Preserve ALL examples from original
✅ Keep ALL links/references from original
✅ Maintain ALL action items from original
✅ Include risks/concerns section if ANY existed
✅ Add completeness check at the end

### NEVER:
❌ Drop any information from original
❌ Leave orphan facts ungrouped
❌ Create more than 5 top-level arguments (merge if needed)
❌ Have empty evidence sections
❌ Omit the Key Message section
❌ Skip the completeness check
❌ Ask clarifying questions - work with what's there

### SPECIAL HANDLING:

**If note is mostly questions/unknowns:**
- Key Message = "Key questions to resolve" or "Open areas requiring investigation"
- Arguments = Categories of unknowns
- Evidence = Specific questions/gaps

**If note is a list without clear conclusion:**
- Key Message = Synthesize a conclusion from the list
- Arguments = Group list items into 3-5 categories
- Evidence = Individual list items under each category

**If note is very short (< 5 sentences):**
- Key Message = Main point
- Arguments = May have only 1-2 arguments
- Evidence = Available details (even if sparse)
- Note: "Document is brief; structure reflects available content"

**If note has no clear theme:**
- Key Message = "Overview of [topic based on content]"
- Arguments = Create logical groupings from scattered points
- Add note: "Original lacked clear thesis; structure inferred from content"

---

## PHASE 5: EXAMPLES

### Example 1: Meeting Notes → Pyramid

**Original Note:**
\`\`\`
Team meeting 12/10
- John mentioned the deployment failed
- Need more testing
- Sarah suggested automated tests
- Budget approved for CI/CD tools
- Target: reduce bugs by 50%
- Current bug rate: 15 per release
- Mike will research Jenkins vs GitHub Actions
- Next meeting Tuesday
\`\`\`

**Pyramid Output:**
\`\`\`markdown
## 🎯 Key Message
We need to implement automated testing to reduce deployment failures, with approved budget and clear targets.

**In brief:** Deployment failures are causing issues (15 bugs/release). Team recommends automated testing to reduce bugs by 50%. Budget is approved; research phase begins immediately.

---

## 📌 Supporting Arguments

### Argument 1: Current State is Problematic
Deployment failures are impacting quality.

**Evidence:**
- John reported deployment failed
- Current bug rate: 15 per release
- Manual testing insufficient

---

### Argument 2: Automated Testing is the Solution
Team consensus on automation approach.

**Evidence:**
- Sarah suggested automated tests
- Industry best practice for CI/CD
- Can catch bugs before deployment

---

### Argument 3: Resources Are Available
Implementation is feasible now.

**Evidence:**
- Budget approved for CI/CD tools
- Clear target: reduce bugs by 50%
- Research phase authorized

---

## ✅ Action Items & Next Steps
- [ ] Mike: Research Jenkins vs GitHub Actions
- [ ] Next meeting: Tuesday

---

## 📋 Completeness Check
**Original points captured:** 8/8 ✅
**Grouping strategy used:** Problem-Solution
\`\`\`

---

### Example 2: Research Notes → Pyramid

**Original Note:**
\`\`\`
Microservices research

Netflix uses microservices. So does Amazon.
Benefits: scalability, independent deployment, team autonomy
Challenges: network latency, data consistency, debugging complexity
We have 50 developers, might be overkill
Current monolith: 200K LOC, 3 year old codebase
Deployment takes 4 hours currently
Martin Fowler recommends "monolith first"
Could start with extracting auth service
Need to train team on Kubernetes
\`\`\`

**Pyramid Output:**
\`\`\`markdown
## 🎯 Key Message
We should consider a gradual microservices migration, starting with a pilot extraction (auth service), while acknowledging significant challenges for our team size.

**In brief:** Microservices offer clear benefits used by industry leaders. However, with 50 developers and current 4-hour deployments, a "monolith first" approach with gradual extraction is recommended over full migration.

---

## 📌 Supporting Arguments

### Argument 1: Industry Validation Exists
Major companies successfully use microservices.

**Evidence:**
- Netflix uses microservices
- Amazon uses microservices
- Proven at massive scale

---

### Argument 2: Clear Benefits Identified
Multiple advantages align with our pain points.

**Evidence:**
- Scalability improvements
- Independent deployment (vs current 4-hour deployment)
- Team autonomy (relevant with 50 developers)

---

### Argument 3: Significant Challenges Present
Migration has real costs and risks.

**Evidence:**
- Network latency concerns
- Data consistency complexity
- Debugging becomes harder
- Team needs Kubernetes training
- Martin Fowler recommends "monolith first" approach

---

### Argument 4: Measured Approach Recommended
Start small, prove value.

**Evidence:**
- Extract auth service as pilot
- Current monolith: 200K LOC, 3 years old
- 50 developers - might be overkill for full microservices
- Validate approach before full commitment

---

## ⚠️ Considerations & Risks
- Team size (50 developers) may not justify full microservices
- Training investment required (Kubernetes)
- Debugging complexity increases
- "Monolith first" wisdom from Martin Fowler

---

## ✅ Action Items & Next Steps
- [ ] Evaluate auth service extraction as POC
- [ ] Plan Kubernetes training
- [ ] Define success metrics for pilot

---

## 📎 References & Sources
- Martin Fowler: "Monolith First" recommendation

---

## 📋 Completeness Check
**Original points captured:** 10/10 ✅
**Grouping strategy used:** Priority (benefits, challenges, recommendation)
\`\`\`

---

## SELF-VALIDATION CHECKLIST

Before outputting, verify:
- [ ] Did I identify the KEY MESSAGE (even if I had to synthesize it)?
- [ ] Are there 2-5 SUPPORTING ARGUMENTS (no more, no less)?
- [ ] Does each argument have EVIDENCE underneath?
- [ ] Did I include ALL action items from original?
- [ ] Did I preserve ALL references/links from original?
- [ ] Did I capture risks/concerns if any existed?
- [ ] Is the COMPLETENESS CHECK accurate?
- [ ] Did I use an appropriate GROUPING STRATEGY?
- [ ] Is this MECE (mutually exclusive, collectively exhaustive)?
- [ ] Did I avoid asking any questions?

**If any check fails, fix before outputting.**

---

## FINAL INSTRUCTION

Transform the document NOW using this exact structure. 
Keep EVERY piece of information from the original.
Output as a replace_all edit command to replace the document content.`;

/**
 * COIN framework transform prompt
 */
export const COIN_PROMPT = `# COIN - Context-Observation-Insight-Next Steps Document Transformer

## CRITICAL RULE:
**TRANSFORM THE ENTIRE NOTE. NO POINTS LEFT BEHIND. NO QUESTIONS.**

When you receive a document:
1. READ the entire note content
2. CATEGORIZE every piece of information into C, O, I, or N
3. EXTRACT all content without dropping anything
4. STRUCTURE into the four COIN sections
5. OUTPUT the restructured document
6. VERIFY nothing was dropped

---

## THE COIN FRAMEWORK

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                         COIN STRUCTURE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    WHY are we here? What's the situation?      │
│  │   CONTEXT   │    Background, history, stakeholders,          │
│  │     (C)     │    problem statement, current state            │
│  └──────┬──────┘                                                │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────┐    WHAT did we see/find? Raw facts only.       │
│  │ OBSERVATION │    Data, metrics, findings, events,            │
│  │     (O)     │    quotes, evidence (NO interpretation)        │
│  └──────┬──────┘                                                │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────┐    SO WHAT? What does it mean?                 │
│  │   INSIGHT   │    Analysis, patterns, conclusions,            │
│  │     (I)     │    implications, learnings                     │
│  └──────┬──────┘                                                │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────┐    NOW WHAT? What actions follow?              │
│  │ NEXT STEPS  │    Recommendations, tasks, decisions,          │
│  │     (N)     │    timelines, owners                           │
│  └─────────────┘                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
\`\`\`

### The Flow Logic:
- **C → O**: Context explains WHY we're looking; Observations show WHAT we found
- **O → I**: Observations are raw data; Insights are interpreted meaning
- **I → N**: Insights justify conclusions; Next Steps are resulting actions

---

## PHASE 1: CONTENT EXTRACTION & CLASSIFICATION

### Step 1.1: Scan for CONTEXT Indicators

| Pattern | Example | Classification |
|---------|---------|----------------|
| Background info | "The project started in 2023..." | CONTEXT |
| Problem statement | "We've been experiencing..." | CONTEXT |
| Stakeholders | "The team includes...", "Client is..." | CONTEXT |
| History | "Previously...", "Last quarter..." | CONTEXT |
| Scope/Constraints | "Budget is...", "Timeline is..." | CONTEXT |
| Current state | "Currently we...", "As of now..." | CONTEXT |
| Goals/Objectives | "The goal is...", "We aim to..." | CONTEXT |
| Assumptions | "Assuming that...", "Given that..." | CONTEXT |

### Step 1.2: Scan for OBSERVATION Indicators

| Pattern | Example | Classification |
|---------|---------|----------------|
| Numbers/Metrics | "Sales increased 40%", "15 bugs found" | OBSERVATION |
| Dates/Events | "On Dec 10, the server crashed" | OBSERVATION |
| Direct quotes | "John said '...'" | OBSERVATION |
| Facts (no opinion) | "The API returns 200ms response" | OBSERVATION |
| Survey results | "80% of users selected..." | OBSERVATION |
| Test results | "Test A passed, Test B failed" | OBSERVATION |
| Comparisons (factual) | "Version 2 is 30% faster than v1" | OBSERVATION |
| Status updates | "Completed: X, Pending: Y" | OBSERVATION |

### Step 1.3: Scan for INSIGHT Indicators

| Pattern | Example | Classification |
|---------|---------|----------------|
| Analysis words | "This suggests...", "This indicates..." | INSIGHT |
| Pattern recognition | "We're seeing a trend of..." | INSIGHT |
| Conclusions | "Therefore...", "This means..." | INSIGHT |
| Interpretations | "This likely happened because..." | INSIGHT |
| Implications | "The impact is...", "This affects..." | INSIGHT |
| Learnings | "We learned that...", "Key takeaway..." | INSIGHT |
| Causal reasoning | "Due to X, we see Y" | INSIGHT |
| Risk assessment | "This could lead to...", "Risk is..." | INSIGHT |

### Step 1.4: Scan for NEXT STEPS Indicators

| Pattern | Example | Classification |
|---------|---------|----------------|
| Action verbs | "We should...", "Need to...", "Must..." | NEXT STEPS |
| Assignments | "John will...", "@Sarah to..." | NEXT STEPS |
| Deadlines | "By Friday...", "Due Q1..." | NEXT STEPS |
| Recommendations | "Recommend...", "Suggest..." | NEXT STEPS |
| Decisions needed | "Decide whether...", "Choose between..." | NEXT STEPS |
| Follow-ups | "Follow up on...", "Check back..." | NEXT STEPS |
| Questions to resolve | "Need to determine...", "TBD:..." | NEXT STEPS |
| Milestones | "Phase 1 complete by...", "Launch date..." | NEXT STEPS |

### Step 1.5: Handle Ambiguous Content

Some content blurs lines between categories:

| Ambiguous Content | Resolution Rule |
|-------------------|-----------------|
| "Sales dropped 20% because of the recession" | Split: "Sales dropped 20%" (O) + "because of recession" (I) |
| "We should fix the bug that John found" | Split: "John found bug" (O) + "We should fix" (N) |
| "The slow API (200ms) is causing user complaints" | Split: "API 200ms" (O) + "causing complaints" (I) |
| Opinion stated as fact | Move to INSIGHT, note it's opinion |
| Historical fact | CONTEXT if background, OBSERVATION if evidence |

### Step 1.6: Content Inventory

Create mental inventory before restructuring:

\`\`\`
CONTEXT items found:    [count] - [brief list]
OBSERVATION items found: [count] - [brief list]
INSIGHT items found:     [count] - [brief list]
NEXT STEPS items found:  [count] - [brief list]
AMBIGUOUS items:         [count] - [how resolved]
─────────────────────────────────────────────
TOTAL items:             [count]
\`\`\`

**⚠️ CRITICAL: Every item MUST appear in final output. No drops.**

---

## PHASE 2: SECTION RULES

### CONTEXT Section Rules

**Purpose:** Set the stage. Reader should understand the situation without prior knowledge.

**Must Include (if present in original):**
- What is this about? (topic/project)
- Why does it matter? (importance/urgency)
- Who is involved? (stakeholders)
- What's the current state? (status quo)
- What constraints exist? (budget/time/scope)
- What triggered this? (catalyst/problem)

**Writing Style:**
- Use past/present tense
- Factual, neutral tone
- Answer: "Why are we discussing this?"

**Minimum Content:** At least 2-3 sentences. If original lacks context, synthesize from available information.

---

### OBSERVATION Section Rules

**Purpose:** Present raw facts. Reader should see evidence before interpretation.

**Must Include (if present in original):**
- All numerical data
- All dates and events
- All direct quotes
- All test/survey results
- All status information
- All comparisons (factual)

**Writing Style:**
- Use bullet points for discrete facts
- NO interpretation words (suggests, indicates, means)
- Pure "what happened" / "what we measured"
- Answer: "What did we actually see/find?"

**Critical Rule:** 
- ✅ "Response time is 200ms" (OBSERVATION)
- ❌ "Response time is 200ms, which is slow" (OBSERVATION + hidden INSIGHT)

Split mixed statements. The interpretation belongs in INSIGHT.

---

### INSIGHT Section Rules

**Purpose:** Interpret the observations. Reader should understand what the data means.

**Must Include (if present in original):**
- All conclusions drawn
- All pattern analyses
- All "because" reasoning
- All risk assessments
- All implications identified
- All learnings stated

**Writing Style:**
- Connect observations to meaning
- Use analysis language: "This suggests...", "The pattern indicates...", "We conclude..."
- Show cause-effect relationships
- Answer: "So what? What does this mean?"

**Structure Options:**
| Type | When to Use |
|------|-------------|
| Single narrative | Clear unified conclusion |
| Bulleted insights | Multiple distinct learnings |
| Prioritized list | Insights ranked by importance |
| Pros/Cons format | Evaluation of options |

**Critical Rule:** Every insight should trace back to an observation. Don't introduce new facts here.

---

### NEXT STEPS Section Rules

**Purpose:** Define actions. Reader should know exactly what to do.

**Must Include (if present in original):**
- All action items
- All recommendations
- All decisions needed
- All open questions
- All deadlines
- All owners/assignees

**Writing Style:**
- Use action verbs: Do, Create, Review, Decide, Schedule
- Include owner if known: "[Owner] to [action]"
- Include deadline if known: "by [date]"
- Use checkboxes for trackability
- Answer: "Now what? What actions follow?"

**Format:**
\`\`\`markdown
### Immediate Actions (This Week)
- [ ] [Owner]: [Action] by [Date]

### Short-term Actions (This Month)
- [ ] [Owner]: [Action] by [Date]

### Decisions Required
- [ ] Decide: [Question] by [Date]

### Open Questions
- [ ] Determine: [Unknown to resolve]
\`\`\`

**Critical Rule:** Actions must be specific and actionable. 
- ❌ "Improve performance" (vague)
- ✅ "Optimize database queries to reduce response time below 100ms" (specific)

---

## PHASE 3: OUTPUT FORMAT (STRICT)

### Document Structure:

\`\`\`markdown
## 📋 COIN Summary
> **Topic:** [What this is about in one line]
> **Status:** [Current state - Active/Completed/Blocked/etc.]
> **Last Updated:** [Date if known]

---

## 🌍 Context
[2-5 paragraphs setting the scene]

**Background:**
[Why this matters, what triggered it]

**Current Situation:**
[Status quo, what exists now]

**Stakeholders:**
[Who is involved, who cares - if applicable]

**Constraints:**
[Budget, timeline, scope limits - if applicable]

---

## 👁️ Observations
[Raw facts, data, evidence - NO interpretation]

### Key Data Points
- [Metric/fact 1]
- [Metric/fact 2]
- [Metric/fact 3]

### Events & Timeline
- [Date]: [What happened]
- [Date]: [What happened]

### Quotes & Feedback
> "[Direct quote 1]" - [Source]
> "[Direct quote 2]" - [Source]

### Status Details
| Item | Status | Notes |
|------|--------|-------|
| [Item 1] | [Status] | [Details] |
| [Item 2] | [Status] | [Details] |

---

## 💡 Insights
[Analysis, interpretation, meaning - derived from observations]

### Key Findings
1. **[Finding 1 Title]:** [Explanation of what it means]
2. **[Finding 2 Title]:** [Explanation of what it means]
3. **[Finding 3 Title]:** [Explanation of what it means]

### Patterns Identified
- [Pattern 1 and what it suggests]
- [Pattern 2 and what it suggests]

### Implications
- [What this means for X]
- [What this means for Y]

### Risks & Concerns
- ⚠️ [Risk 1]: [Why it matters]
- ⚠️ [Risk 2]: [Why it matters]

---

## ➡️ Next Steps
[Actions, recommendations, decisions]

### Immediate Actions
- [ ] **[Owner]**: [Specific action] *(by [date])*
- [ ] **[Owner]**: [Specific action] *(by [date])*

### Short-term Actions
- [ ] **[Owner]**: [Specific action] *(by [date])*

### Decisions Required
- [ ] **Decide**: [Question needing resolution] *(by [date])*

### Open Questions
- [ ] **Determine**: [Unknown to resolve]
- [ ] **Research**: [Area needing investigation]

### Success Criteria
- [How we'll know this succeeded]

---

## 📊 Completeness Check
| Section | Items Captured | Status |
|---------|---------------|--------|
| Context | [X] items | ✅ |
| Observations | [X] items | ✅ |
| Insights | [X] items | ✅ |
| Next Steps | [X] items | ✅ |
| **Total** | [X] items | ✅ |
\`\`\`

---

## PHASE 4: TRANSFORMATION RULES

### ALWAYS:
✅ Separate observations from insights (split mixed statements)
✅ Include ALL numerical data in Observations
✅ Include ALL action items in Next Steps
✅ Include ALL reasoning/conclusions in Insights
✅ Provide context even if minimal in original (synthesize if needed)
✅ Use the exact section headers (Context, Observations, Insights, Next Steps)
✅ Add completeness check at the end
✅ Preserve ALL links/references from original
✅ Keep ALL dates and deadlines

### NEVER:
❌ Put interpretations in Observations
❌ Put raw facts in Insights
❌ Drop any data points
❌ Leave Next Steps vague
❌ Skip any of the four sections
❌ Ask clarifying questions
❌ Combine O and I into one section

### SPECIAL HANDLING:

**If note is mostly raw data (heavy O, light I):**
- Observations: Include all data points
- Insights: Synthesize basic analysis from patterns in data
- Note: "Insights synthesized from available data; further analysis recommended"

**If note is mostly opinions/analysis (heavy I, light O):**
- Observations: Extract any facts/data mentioned
- Insights: Include analysis but flag unsupported claims
- Note: "Some insights lack supporting observations; consider gathering data"

**If note lacks action items (no N):**
- Next Steps: Generate logical actions from insights
- Note: "Next steps inferred from insights; validate with stakeholders"

**If note lacks background (no C):**
- Context: Synthesize from content themes
- Note: "Context inferred from document content"

**If note is very short (< 5 sentences):**
- Fill what you can, mark sparse sections
- Note: "Document is brief; some sections have limited content"

---

## PHASE 5: EXAMPLES

### Example 1: Meeting Notes → COIN

**Original Note:**
\`\`\`
Sprint retro 12/10

Velocity dropped from 45 to 32 points. Team feels burned out.
Sarah: "Too many meetings killing focus time"
Bug count up 40% this sprint
Need to reduce meeting load
John suggests no-meeting Wednesdays
Product wants more features faster
Should discuss with stakeholders
Mike out sick 3 days affected delivery
\`\`\`

**COIN Output:**
\`\`\`markdown
## 📋 COIN Summary
> **Topic:** Sprint Retrospective - Velocity & Team Health Issues
> **Status:** Action Required
> **Last Updated:** Dec 10

---

## 🌍 Context
This sprint retrospective addresses concerning trends in team performance and wellbeing. The team is facing pressure from Product to deliver more features while simultaneously experiencing burnout and reduced output capacity.

**Current Situation:**
The development team is showing signs of strain with declining velocity and increasing defects. External pressure for faster feature delivery conflicts with team capacity constraints.

**Stakeholders:**
- Development Team (affected)
- Product Team (requesting more features)
- Stakeholders (need to be consulted on tradeoffs)

---

## 👁️ Observations
### Key Data Points
- Velocity dropped from 45 to 32 points (29% decrease)
- Bug count increased 40% this sprint
- Mike was out sick for 3 days (impacted delivery)

### Quotes & Feedback
> "Too many meetings killing focus time" - Sarah

### Team Sentiment
- Team reports feeling burned out
- Concerns about meeting overload

### External Factors
- Product team requesting more features faster
- Stakeholder alignment pending

---

## 💡 Insights
### Key Findings
1. **Meeting Overload is a Root Cause:** Sarah's feedback about meetings "killing focus time" directly correlates with the velocity drop. Developers need uninterrupted blocks for complex work.

2. **Quality Suffering Under Pressure:** The 40% bug increase suggests rushing to meet demands is creating technical debt. Speed is coming at the cost of quality.

3. **Capacity vs. Expectations Mismatch:** Product's request for "more features faster" contradicts team's actual capacity (32 points, burned out). This expectation gap needs addressing.

4. **Single Points of Failure:** Mike's 3-day absence noticeably impacted delivery, indicating potential bus factor issues.

### Risks & Concerns
- ⚠️ Continued pressure could lead to attrition
- ⚠️ Bug rate may compound if not addressed
- ⚠️ Team morale declining

---

## ➡️ Next Steps
### Immediate Actions
- [ ] **John**: Propose no-meeting Wednesdays to leadership *(this week)*
- [ ] **Scrum Master**: Schedule stakeholder discussion on capacity vs. expectations *(this week)*

### Short-term Actions
- [ ] **Team Lead**: Analyze meeting calendar and identify cuts *(by next sprint)*
- [ ] **Team**: Review bug root causes for process improvement *(next retro)*

### Decisions Required
- [ ] **Decide**: Implement no-meeting day policy? *(with leadership)*
- [ ] **Decide**: Reduce sprint commitment while team recovers? *(with Product)*

### Open Questions
- [ ] **Determine**: Sustainable velocity target for this team
- [ ] **Research**: Cross-training to reduce single points of failure

---

## 📊 Completeness Check
| Section | Items Captured | Status |
|---------|---------------|--------|
| Context | 3 items | ✅ |
| Observations | 6 items | ✅ |
| Insights | 4 findings + 3 risks | ✅ |
| Next Steps | 6 actions + 2 decisions + 2 questions | ✅ |
| **Total** | 20 items | ✅ |
\`\`\`

---

### Example 2: Research Notes → COIN

**Original Note:**
\`\`\`
API Performance Research

Checked competitor APIs yesterday
Our API: 450ms avg response
Competitor A: 120ms
Competitor B: 180ms
We're 3-4x slower

Database queries are the bottleneck - 70% of time
No caching layer currently
Redis could help - used by Competitor A
Team has no Redis experience

Options:
1. Add Redis cache ($500/mo)
2. Optimize queries first (2 weeks work)
3. Both

Recommend starting with query optimization
then adding Redis in Q2
Need budget approval for Redis
\`\`\`

**COIN Output:**
\`\`\`markdown
## 📋 COIN Summary
> **Topic:** API Performance Analysis & Improvement Options
> **Status:** Recommendations Ready - Awaiting Approval
> **Last Updated:** Yesterday's research

---

## 🌍 Context
This analysis compares our API performance against competitors to identify improvement opportunities. Performance is a critical factor for user experience and competitive positioning.

**Current Situation:**
Our API is significantly slower than competitors, creating a potential competitive disadvantage. The investigation aims to identify root causes and propose solutions.

**Constraints:**
- Team lacks Redis experience (training/ramp-up needed)
- Budget approval required for infrastructure changes

---

## 👁️ Observations
### Key Data Points
| API | Avg Response Time |
|-----|-------------------|
| Our API | 450ms |
| Competitor A | 120ms |
| Competitor B | 180ms |

- Performance gap: 3-4x slower than competitors
- Database queries consume 70% of response time
- No caching layer currently implemented
- Competitor A uses Redis caching

### Technical Findings
- Database queries identified as primary bottleneck
- Caching infrastructure absent from current architecture

### Team Capabilities
- No existing Redis experience on team

### Cost Data
- Redis implementation: ~$500/month

---

## 💡 Insights
### Key Findings
1. **Database is the Clear Bottleneck:** With 70% of response time in queries, this is the highest-impact area. Query optimization alone could yield significant gains.

2. **Caching Gap is Competitive Disadvantage:** Competitor A's use of Redis likely explains their 120ms performance. We're missing a standard optimization layer.

3. **Quick Wins Available:** Query optimization requires no new infrastructure and no additional cost - just engineering time. This is low-risk, high-potential-reward.

4. **Phased Approach Reduces Risk:** Starting with queries before Redis allows team to:
   - Prove value with zero infrastructure cost
   - Buy time for Redis learning curve
   - Make data-driven decision on caching need

### Implications
- Without improvement, competitive position weakens
- 2-week query optimization investment could yield 30-50% improvement
- Redis adds complexity but may be necessary for parity with Competitor A

---

## ➡️ Next Steps
### Recommended Sequence
**Phase 1: Query Optimization (Immediate)**
- [ ] **Dev Team**: Identify and optimize slowest queries *(2 weeks)*
- [ ] **Dev Team**: Measure improvement after optimization

**Phase 2: Caching Layer (Q2)**
- [ ] **Team Lead**: Submit budget request for Redis ($500/mo)
- [ ] **Dev Team**: Begin Redis training/POC
- [ ] **Dev Team**: Implement caching for hot paths

### Decisions Required
- [ ] **Decide**: Approve 2-week query optimization sprint? *(immediate)*
- [ ] **Decide**: Approve Redis budget for Q2? *(before Q2 planning)*

### Success Criteria
- Phase 1: Reduce response time to <300ms (33% improvement)
- Phase 2: Achieve <150ms (competitive with Competitor B)

---

## 📊 Completeness Check
| Section | Items Captured | Status |
|---------|---------------|--------|
| Context | 2 items | ✅ |
| Observations | 8 items | ✅ |
| Insights | 4 findings + 3 implications | ✅ |
| Next Steps | 5 actions + 2 decisions + criteria | ✅ |
| **Total** | 24 items | ✅ |
\`\`\`

---

## SELF-VALIDATION CHECKLIST

Before outputting, verify:
- [ ] Did I separate OBSERVATIONS (facts) from INSIGHTS (interpretation)?
- [ ] Are ALL numbers/metrics in Observations?
- [ ] Are ALL conclusions/analysis in Insights?
- [ ] Are ALL action items in Next Steps?
- [ ] Did I include Context (even if I had to synthesize)?
- [ ] Does each Insight connect back to an Observation?
- [ ] Are Next Steps specific and actionable (not vague)?
- [ ] Did I preserve ALL original content?
- [ ] Is the Completeness Check accurate?
- [ ] Did I avoid asking any questions?

**If any check fails, fix before outputting.**

---

## CRITICAL DIFFERENCE: OBSERVATION vs INSIGHT

This is the most common mistake. Use this test:

| Statement | Test Question | Result |
|-----------|---------------|--------|
| "Response time is 450ms" | Can you measure/verify this directly? | Yes → OBSERVATION |
| "Response time is too slow" | Is "too slow" a judgment/interpretation? | Yes → INSIGHT |
| "Sales dropped 20%" | Is this a measurable fact? | Yes → OBSERVATION |
| "Sales dropped because of the recession" | Is "because" adding interpretation? | Yes → INSIGHT |
| "Users clicked button 500 times" | Raw metric? | Yes → OBSERVATION |
| "Users prefer the new button" | Inference from data? | Yes → INSIGHT |

**When in doubt:** If removing it would lose factual data → OBSERVATION. If removing it would lose analysis → INSIGHT.

---

## FINAL INSTRUCTION

Transform the document NOW using this exact COIN structure.
Separate observations from insights rigorously.
Keep EVERY piece of information from the original.
Output as a replace_all edit command to replace the document content.`;

/**
 * Developer-focused transform prompt
 */
export const DEVELOPER_PROMPT = `# DEVELOPER - Technical Documentation Transformer

## CRITICAL RULE:
**TRANSFORM THE ENTIRE NOTE INTO DEVELOPER DOCUMENTATION. NO INFORMATION DROPPED. NO QUESTIONS.**

When you receive a document:
1. READ the entire note content
2. IDENTIFY all technical information
3. CATEGORIZE into documentation sections
4. STRUCTURE with proper technical formatting
5. OUTPUT the restructured document
6. VERIFY nothing was dropped

---

## THE DEVELOPER DOCUMENTATION FRAMEWORK

\`\`\`
┌─────────────────────────────────────────────────────────────────────────┐
│                    DEVELOPER DOCUMENTATION STRUCTURE                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ OVERVIEW - What is this? Why does it exist?                      │   │
│  │ TL;DR for developers. Quick understanding in 30 seconds.         │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ REQUIREMENTS - What do I need before starting?                   │   │
│  │ Prerequisites, dependencies, environment, permissions            │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ ARCHITECTURE - How is it designed?                               │   │
│  │ System design, components, data flow, patterns used              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ INSTALLATION & SETUP - How do I get it running?                  │   │
│  │ Step-by-step setup, configuration, verification                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ API REFERENCE - What can I call?                                 │   │
│  │ Endpoints, methods, parameters, responses, examples              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ USAGE & EXAMPLES - How do I use it?                              │   │
│  │ Code samples, common patterns, integration examples              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ CONFIGURATION - How do I customize it?                           │   │
│  │ Config options, environment variables, feature flags             │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ TROUBLESHOOTING - What if something breaks?                      │   │
│  │ Common errors, debugging tips, FAQs, support                     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
\`\`\`

---

## PHASE 1: TECHNICAL CONTENT EXTRACTION

### Step 1.1: Identify OVERVIEW Content

| Pattern | Example | Classification |
|---------|---------|----------------|
| Purpose statement | "This is a...", "Used for..." | OVERVIEW |
| Problem it solves | "Solves the issue of..." | OVERVIEW |
| Key features | "Features include...", "Supports..." | OVERVIEW |
| Technology stack | "Built with React, Node.js..." | OVERVIEW |
| Project type | "CLI tool", "REST API", "Library" | OVERVIEW |
| Version info | "v2.0", "Current version..." | OVERVIEW |
| License | "MIT", "Apache 2.0" | OVERVIEW |
| Repository link | "github.com/..." | OVERVIEW |

### Step 1.2: Identify REQUIREMENTS Content

| Pattern | Example | Classification |
|---------|---------|----------------|
| Language version | "Python 3.9+", "Node 18+" | REQUIREMENTS |
| Dependencies | "requires lodash", "npm install..." | REQUIREMENTS |
| System requirements | "4GB RAM", "Linux/Mac/Windows" | REQUIREMENTS |
| Permissions | "admin access", "sudo required" | REQUIREMENTS |
| External services | "needs Redis", "requires AWS account" | REQUIREMENTS |
| API keys/tokens | "get API key from...", "token required" | REQUIREMENTS |
| Database | "PostgreSQL 14+", "MongoDB" | REQUIREMENTS |
| Hardware | "GPU recommended", "SSD required" | REQUIREMENTS |

### Step 1.3: Identify ARCHITECTURE Content

| Pattern | Example | Classification |
|---------|---------|----------------|
| Design patterns | "uses MVC", "event-driven", "microservices" | ARCHITECTURE |
| Component names | "AuthService", "UserController" | ARCHITECTURE |
| Data flow | "request → validator → handler → response" | ARCHITECTURE |
| File structure | "src/", "lib/", folder descriptions | ARCHITECTURE |
| Diagrams | Mermaid, ASCII art, flowcharts | ARCHITECTURE |
| Layers | "presentation layer", "data layer" | ARCHITECTURE |
| Interfaces | "implements IRepository", "extends Base" | ARCHITECTURE |
| Database schema | Tables, relationships, ERD | ARCHITECTURE |

### Step 1.4: Identify INSTALLATION Content

| Pattern | Example | Classification |
|---------|---------|----------------|
| Install commands | "npm install", "pip install", "brew install" | INSTALLATION |
| Clone instructions | "git clone..." | INSTALLATION |
| Build steps | "npm run build", "make" | INSTALLATION |
| Environment setup | "create .env file", "export VAR=..." | INSTALLATION |
| Database setup | "run migrations", "seed database" | INSTALLATION |
| Verification | "run tests", "check version" | INSTALLATION |
| Docker commands | "docker-compose up", "docker build" | INSTALLATION |
| Post-install | "configure X", "initialize Y" | INSTALLATION |

### Step 1.5: Identify API REFERENCE Content

| Pattern | Example | Classification |
|---------|---------|----------------|
| Endpoints | "GET /api/users", "POST /auth/login" | API |
| HTTP methods | GET, POST, PUT, DELETE, PATCH | API |
| Parameters | "id (required)", "?limit=10" | API |
| Request body | "{ username, password }" | API |
| Response format | "returns { data, meta }" | API |
| Status codes | "200 OK", "404 Not Found" | API |
| Headers | "Authorization: Bearer...", "Content-Type" | API |
| Function signatures | "async function getUser(id: string)" | API |
| Method descriptions | "Creates a new user...", "Returns all..." | API |
| Rate limits | "100 requests/minute" | API |

### Step 1.6: Identify USAGE Content

| Pattern | Example | Classification |
|---------|---------|----------------|
| Code examples | Code blocks, snippets | USAGE |
| Import statements | "import { x } from 'y'" | USAGE |
| Initialization | "const client = new Client()" | USAGE |
| Common patterns | "typically used like..." | USAGE |
| Integration examples | "with React:", "in Express:" | USAGE |
| Best practices | "recommended to...", "prefer X over Y" | USAGE |
| Warnings | "⚠️ Don't do X", "avoid..." | USAGE |
| Tips | "💡 Pro tip:", "for better performance..." | USAGE |

### Step 1.7: Identify CONFIGURATION Content

| Pattern | Example | Classification |
|---------|---------|----------------|
| Config files | "config.json", "settings.yaml", ".env" | CONFIG |
| Environment vars | "DATABASE_URL=", "API_KEY=" | CONFIG |
| Options/flags | "--verbose", "-d", "debug: true" | CONFIG |
| Feature toggles | "enableFeatureX: true" | CONFIG |
| Default values | "defaults to 3000", "default: 'localhost'" | CONFIG |
| Config schemas | TypeScript interfaces, JSON schemas | CONFIG |
| Profiles | "development", "production", "test" | CONFIG |
| Secrets management | "use vault", "AWS Secrets Manager" | CONFIG |

### Step 1.8: Identify TROUBLESHOOTING Content

| Pattern | Example | Classification |
|---------|---------|----------------|
| Error messages | "Error: ECONNREFUSED", "TypeError:" | TROUBLESHOOTING |
| Common issues | "if you see X, try Y" | TROUBLESHOOTING |
| Debug commands | "DEBUG=* npm start", "verbose logging" | TROUBLESHOOTING |
| Known limitations | "doesn't support...", "limitation:" | TROUBLESHOOTING |
| Workarounds | "as a workaround...", "temporary fix:" | TROUBLESHOOTING |
| FAQ patterns | "Why does X?", "How to fix Y?" | TROUBLESHOOTING |
| Support channels | "file issue at...", "Discord:", "Stack Overflow" | TROUBLESHOOTING |
| Logs location | "check logs at /var/log/..." | TROUBLESHOOTING |

### Step 1.9: Content Inventory

\`\`\`
OVERVIEW items:        [count] - [brief list]
REQUIREMENTS items:    [count] - [brief list]
ARCHITECTURE items:    [count] - [brief list]
INSTALLATION items:    [count] - [brief list]
API REFERENCE items:   [count] - [brief list]
USAGE items:           [count] - [brief list]
CONFIGURATION items:   [count] - [brief list]
TROUBLESHOOTING items: [count] - [brief list]
───────────────────────────────────────────────
TOTAL items:           [count]
\`\`\`

**⚠️ CRITICAL: Every item MUST appear in final output. No drops.**

---

## PHASE 2: SECTION RULES

### OVERVIEW Section Rules

**Purpose:** Developer should understand what this is and whether it's relevant to them in <30 seconds.

**Must Include:**
- What it is (one sentence)
- What problem it solves
- Key features (3-5 bullets max)
- Tech stack (if mentioned)
- Quick links (repo, docs, demo)

**Format:**
\`\`\`markdown
## Overview

Brief description of what this is.

### Key Features
- Feature 1
- Feature 2
- Feature 3

### Tech Stack
- Technology 1
- Technology 2

### Quick Links
- [Repository](url)
- [Documentation](url)
\`\`\`

---

### REQUIREMENTS Section Rules

**Purpose:** Developer should know exactly what they need before starting.

**Must Include:**
- Runtime requirements (language versions)
- Dependencies (packages, libraries)
- System requirements (OS, RAM, disk)
- External services (databases, APIs)
- Permissions/access needed

**Format:**
\`\`\`markdown
## Requirements

### Prerequisites
| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 18+ | Required |
| npm | 9+ | Comes with Node |

### Dependencies
- dependency1: purpose
- dependency2: purpose

### External Services
- Service 1: why needed
- Service 2: why needed
\`\`\`

---

### ARCHITECTURE Section Rules

**Purpose:** Developer should understand how the system is designed.

**Must Include:**
- High-level design (diagram if possible)
- Component breakdown
- Data flow
- File/folder structure
- Design patterns used

**Format with Mermaid (when applicable):**
\`\`\`markdown
## Architecture

### System Design
\`\`\`mermaid
flowchart TB
    A[Client] --> B[API Gateway]
    B --> C[Auth Service]
    B --> D[User Service]
    C --> E[(Database)]
    D --> E
\`\`\`

### Components
| Component | Responsibility |
|-----------|---------------|
| Component1 | Does X |
| Component2 | Does Y |

### Directory Structure
\`\`\`
src/
├── controllers/    # Request handlers
├── services/       # Business logic
├── models/         # Data models
├── utils/          # Helper functions
└── config/         # Configuration
\`\`\`
\`\`\`

---

### INSTALLATION Section Rules

**Purpose:** Developer should go from zero to running in minimal steps.

**Must Include:**
- Clone/download instructions
- Install commands (numbered steps)
- Environment setup
- Database setup (if applicable)
- Verification step

**Format:**
\`\`\`markdown
## Installation

### Quick Start
\`\`\`bash
# Clone repository
git clone https://github.com/user/repo.git
cd repo

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Run application
npm start
\`\`\`

### Detailed Steps

#### 1. Clone Repository
\`\`\`bash
git clone https://github.com/user/repo.git
\`\`\`

#### 2. Install Dependencies
\`\`\`bash
npm install
\`\`\`

#### 3. Configure Environment
Create \`.env\` file:
\`\`\`env
DATABASE_URL=postgresql://localhost:5432/mydb
API_KEY=your-api-key
\`\`\`

#### 4. Verify Installation
\`\`\`bash
npm test
# Expected: All tests passing
\`\`\`
\`\`\`

---

### API REFERENCE Section Rules

**Purpose:** Developer should find any endpoint/method quickly with complete details.

**Must Include (for each endpoint/method):**
- Method/endpoint path
- Description
- Parameters (required/optional)
- Request body schema
- Response schema
- Example request/response
- Error codes

**Format for REST APIs:**
\`\`\`markdown
## API Reference

### Authentication

#### POST /auth/login
Authenticate user and receive access token.

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User email |
| password | string | Yes | User password |

**Example Request:**
\`\`\`bash
curl -X POST https://api.example.com/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "user@example.com", "password": "secret"}'
\`\`\`

**Success Response (200):**
\`\`\`json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600
}
\`\`\`

**Error Responses:**
| Code | Description |
|------|-------------|
| 400 | Invalid request body |
| 401 | Invalid credentials |
| 429 | Rate limit exceeded |
\`\`\`

**Format for Functions/Methods:**
\`\`\`markdown
### \`functionName(param1, param2)\`

Description of what the function does.

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| param1 | string | - | Required parameter |
| param2 | number | 10 | Optional with default |

**Returns:** \`Promise<Result>\`

**Example:**
\`\`\`typescript
const result = await functionName('value', 20);
// Output: { success: true, data: [...] }
\`\`\`

**Throws:**
- \`ValidationError\` - When param1 is empty
- \`NetworkError\` - When connection fails
\`\`\`

---

### USAGE Section Rules

**Purpose:** Developer should see practical examples they can copy-paste and adapt.

**Must Include:**
- Basic usage example
- Common use cases (2-3 minimum)
- Integration examples
- Best practices
- Anti-patterns (what NOT to do)

**Format:**
\`\`\`markdown
## Usage

### Basic Example
\`\`\`typescript
import { Client } from 'my-library';

const client = new Client({ apiKey: 'your-key' });
const result = await client.doSomething();
\`\`\`

### Common Use Cases

#### Use Case 1: [Name]
\`\`\`typescript
// Code example
\`\`\`

#### Use Case 2: [Name]
\`\`\`typescript
// Code example
\`\`\`

### Integration Examples

#### With Express.js
\`\`\`typescript
// Integration code
\`\`\`

#### With React
\`\`\`tsx
// Integration code
\`\`\`

### Best Practices
- ✅ Do: [Good practice]
- ✅ Do: [Good practice]
- ❌ Don't: [Anti-pattern]
- ❌ Don't: [Anti-pattern]
\`\`\`

---

### CONFIGURATION Section Rules

**Purpose:** Developer should find all configurable options with clear explanations.

**Must Include:**
- All config options (complete list)
- Default values
- Type/format for each option
- Environment variables
- Example configurations

**Format:**
\`\`\`markdown
## Configuration

### Environment Variables
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| DATABASE_URL | Yes | - | Database connection string |
| PORT | No | 3000 | Server port |
| LOG_LEVEL | No | info | Logging verbosity |

### Configuration File
Create \`config.json\` in project root:

\`\`\`json
{
  "server": {
    "port": 3000,
    "host": "localhost"
  },
  "database": {
    "url": "postgresql://...",
    "poolSize": 10
  },
  "features": {
    "enableCache": true,
    "debugMode": false
  }
}
\`\`\`

### Configuration Options Reference

#### server.port
- **Type:** number
- **Default:** 3000
- **Description:** Port the server listens on

#### server.host
- **Type:** string
- **Default:** "localhost"
- **Description:** Host address to bind
\`\`\`

---

### TROUBLESHOOTING Section Rules

**Purpose:** Developer should quickly find solutions to common problems.

**Must Include:**
- Common errors with solutions
- Debug mode instructions
- Log locations
- FAQ
- Support/help channels

**Format:**
\`\`\`markdown
## Troubleshooting

### Common Errors

#### Error: ECONNREFUSED
**Cause:** Database is not running
**Solution:**
\`\`\`bash
# Start database
docker-compose up -d postgres
\`\`\`

#### Error: ENOENT: no such file or directory
**Cause:** Missing configuration file
**Solution:** Ensure \`.env\` file exists in project root

### Debugging

Enable debug mode:
\`\`\`bash
DEBUG=app:* npm start
\`\`\`

### Logs
- Application logs: \`./logs/app.log\`
- Error logs: \`./logs/error.log\`

### FAQ

**Q: Why is X slow?**
A: Check database indexes and enable caching.

**Q: How do I reset the database?**
A: Run \`npm run db:reset\`

### Getting Help
- 📖 [Documentation](url)
- 💬 [Discord](url)
- 🐛 [Issue Tracker](url)
\`\`\`

---

## PHASE 3: OUTPUT FORMAT (STRICT)

### Complete Document Structure:

\`\`\`markdown
# [Project/Component Name]

> [One-line description]

![Version](badge) ![License](badge) ![Build](badge)

---

## 📖 Table of Contents
- [Overview](#overview)
- [Requirements](#requirements)
- [Architecture](#architecture)
- [Installation](#installation)
- [API Reference](#api-reference)
- [Usage](#usage)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

[What this is and why it exists - 2-3 sentences]

### Key Features
- ✨ Feature 1
- ✨ Feature 2
- ✨ Feature 3

### Tech Stack
| Category | Technology |
|----------|------------|
| Language | [Language] |
| Framework | [Framework] |
| Database | [Database] |

### Quick Links
| Resource | Link |
|----------|------|
| Repository | [Link] |
| Documentation | [Link] |
| Demo | [Link] |

---

## 📋 Requirements

### Prerequisites
| Requirement | Version | Required | Notes |
|-------------|---------|----------|-------|
| [Requirement] | [Version] | [Yes/No] | [Notes] |

### System Requirements
- **OS:** [Supported operating systems]
- **Memory:** [RAM requirements]
- **Disk:** [Disk space needed]

### External Services
| Service | Purpose | Setup Guide |
|---------|---------|-------------|
| [Service] | [Why needed] | [Link/Instructions] |

---

## 🏗️ Architecture

### System Overview
\`\`\`mermaid
[Diagram if applicable]
\`\`\`

### Components
| Component | Responsibility | Location |
|-----------|---------------|----------|
| [Component] | [What it does] | [Path/Module] |

### Data Flow
[Description or diagram of how data moves through system]

### Directory Structure
\`\`\`
[Project structure with annotations]
\`\`\`

### Design Patterns Used
- **[Pattern Name]:** [Where/why used]

---

## 🚀 Installation

### Quick Start
\`\`\`bash
[Minimum commands to get running]
\`\`\`

### Step-by-Step Guide

#### Step 1: [Name]
\`\`\`bash
[Commands]
\`\`\`
[Explanation if needed]

#### Step 2: [Name]
\`\`\`bash
[Commands]
\`\`\`

#### Step 3: Verify Installation
\`\`\`bash
[Verification command]
# Expected output: [What success looks like]
\`\`\`

### Docker Installation (if applicable)
\`\`\`bash
[Docker commands]
\`\`\`

---

## 📚 API Reference

### Endpoints Overview
| Method | Endpoint | Description |
|--------|----------|-------------|
| [METHOD] | [/path] | [Description] |

### [Endpoint Group Name]

#### [METHOD] [/endpoint]
[Description]

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| [Header] | [Yes/No] | [Description] |

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| [Param] | [Type] | [Yes/No] | [Description] |

**Request Body:**
\`\`\`json
[Example request]
\`\`\`

**Response:**
\`\`\`json
[Example response]
\`\`\`

**Status Codes:**
| Code | Description |
|------|-------------|
| [Code] | [Meaning] |

---

## 💻 Usage

### Basic Usage
\`\`\`[language]
[Basic example code]
\`\`\`

### Examples

#### Example 1: [Use Case Name]
\`\`\`[language]
[Code example]
\`\`\`

#### Example 2: [Use Case Name]
\`\`\`[language]
[Code example]
\`\`\`

### Integration Guides

#### With [Framework/Tool]
\`\`\`[language]
[Integration code]
\`\`\`

### Best Practices
| Do ✅ | Don't ❌ |
|-------|---------|
| [Good practice] | [Anti-pattern] |

---

## ⚙️ Configuration

### Environment Variables
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| [VAR_NAME] | [Yes/No] | [Default] | [Description] |

### Configuration File
\`\`\`[format]
[Example configuration]
\`\`\`

### Configuration Options

#### [option.name]
| Property | Value |
|----------|-------|
| Type | [Type] |
| Default | [Default] |
| Description | [Description] |
| Example | [Example] |

---

## 🔧 Troubleshooting

### Common Issues

#### [Error Name/Message]
| Property | Value |
|----------|-------|
| Cause | [Why this happens] |
| Solution | [How to fix] |

\`\`\`bash
[Fix commands if applicable]
\`\`\`

### Debugging
\`\`\`bash
[Debug mode commands]
\`\`\`

### Logs
| Log Type | Location |
|----------|----------|
| [Type] | [Path] |

### FAQ
<details>
<summary><strong>Q: [Question]?</strong></summary>
A: [Answer]
</details>

### Getting Help
- 📖 Documentation: [Link]
- 💬 Community: [Link]
- 🐛 Issues: [Link]

---

## 📊 Documentation Completeness
| Section | Items | Status |
|---------|-------|--------|
| Overview | [X] | ✅ |
| Requirements | [X] | ✅ |
| Architecture | [X] | ✅ |
| Installation | [X] | ✅ |
| API Reference | [X] | ✅ |
| Usage | [X] | ✅ |
| Configuration | [X] | ✅ |
| Troubleshooting | [X] | ✅ |
| **Total** | [X] | ✅ |

---

*Last updated: [Date]*
\`\`\`

---

## PHASE 4: TRANSFORMATION RULES

### ALWAYS:
✅ Include ALL code snippets from original (properly formatted)
✅ Preserve ALL technical details (versions, configs, commands)
✅ Add language identifier to ALL code blocks (\`\`\`python, \`\`\`bash, etc.)
✅ Create Mermaid diagrams for architecture when data flow is described
✅ Include table of contents for documents with 3+ sections
✅ Add completeness check at the end
✅ Use consistent heading hierarchy (##, ###, ####)
✅ Include verification steps in installation
✅ Provide copy-pasteable commands

### NEVER:
❌ Drop any code examples
❌ Remove version numbers or technical specifications
❌ Leave code blocks without language identifiers
❌ Skip error handling documentation if errors are mentioned
❌ Omit configuration options mentioned in original
❌ Create fake/placeholder API endpoints not in original
❌ Ask clarifying questions

### SPECIAL HANDLING:

**If note is mostly code snippets:**
- Usage section becomes primary
- Extract implicit API from function signatures
- Architecture inferred from imports/dependencies
- Note: "API inferred from code; verify accuracy"

**If note is architecture/design only:**
- Architecture section becomes primary
- Installation/Usage may be sparse
- Note: "Implementation details not provided in original"

**If note is meeting notes about technical decisions:**
- Extract decisions → Architecture
- Extract action items → Installation/TODO
- Extract concerns → Troubleshooting
- Note: "Converted from technical discussion notes"

**If note lacks code examples:**
- Provide placeholder structure: \`// TODO: Add example\`
- Note: "Code examples not provided in original; add when available"

**If note is very short:**
- Fill applicable sections, mark others as "Not documented"
- Note: "Documentation is incomplete; expand as project develops"

---

## PHASE 5: EXAMPLES

### Example 1: Scattered Technical Notes → Developer Docs

**Original Note:**
\`\`\`
Auth service notes

Uses JWT tokens, expires in 1 hour
Need Redis for session storage
POST /login takes email and password
Returns { token, refreshToken }
Passwords hashed with bcrypt, 10 rounds

Install: npm install jsonwebtoken bcrypt redis

Common error: "TokenExpired" - need to refresh
Set JWT_SECRET in env

const token = jwt.sign({ userId }, secret, { expiresIn: '1h' })

Refresh token lasts 7 days
Store refresh tokens in Redis

Rate limit: 5 login attempts per minute
\`\`\`

**Developer Docs Output:**
\`\`\`markdown
# Auth Service

> JWT-based authentication service with Redis session storage

---

## 📖 Table of Contents
- [Overview](#overview)
- [Requirements](#requirements)
- [Architecture](#architecture)
- [Installation](#installation)
- [API Reference](#api-reference)
- [Usage](#usage)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

JWT-based authentication service providing secure user authentication with refresh token support.

### Key Features
- ✨ JWT access tokens (1-hour expiry)
- ✨ Refresh tokens (7-day expiry)
- ✨ Redis session storage
- ✨ Bcrypt password hashing (10 rounds)
- ✨ Rate limiting (5 attempts/minute)

### Tech Stack
| Category | Technology |
|----------|------------|
| Auth | JWT (jsonwebtoken) |
| Hashing | bcrypt |
| Session Store | Redis |

---

## 📋 Requirements

### Prerequisites
| Requirement | Version | Required | Notes |
|-------------|---------|----------|-------|
| Node.js | 18+ | Yes | Runtime |
| Redis | 6+ | Yes | Session storage |

### Dependencies
| Package | Purpose |
|---------|---------|
| jsonwebtoken | JWT creation/verification |
| bcrypt | Password hashing |
| redis | Session storage client |

---

## 🏗️ Architecture

### System Overview
\`\`\`mermaid
flowchart LR
    A[Client] -->|POST /login| B[Auth Service]
    B -->|Verify| C[User DB]
    B -->|Store Session| D[(Redis)]
    B -->|Return Tokens| A
\`\`\`

### Security Design
| Aspect | Implementation |
|--------|---------------|
| Password Storage | bcrypt, 10 salt rounds |
| Access Token | JWT, 1-hour expiry |
| Refresh Token | Stored in Redis, 7-day expiry |
| Rate Limiting | 5 attempts per minute |

---

## 🚀 Installation

### Quick Start
\`\`\`bash
npm install jsonwebtoken bcrypt redis
\`\`\`

### Environment Setup
Create \`.env\` file:
\`\`\`env
JWT_SECRET=your-super-secret-key-min-32-chars
REDIS_URL=redis://localhost:6379
\`\`\`

### Verify Redis Connection
\`\`\`bash
redis-cli ping
# Expected: PONG
\`\`\`

---

## 📚 API Reference

### Endpoints Overview
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /login | Authenticate user |

### Authentication

#### POST /login
Authenticate user with email and password.

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User email |
| password | string | Yes | User password |

**Example Request:**
\`\`\`bash
curl -X POST http://localhost:3000/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "user@example.com", "password": "secret"}'
\`\`\`

**Success Response (200):**
\`\`\`json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2..."
}
\`\`\`

**Rate Limiting:**
- 5 login attempts per minute per IP
- Returns 429 when exceeded

---

## 💻 Usage

### Token Generation
\`\`\`javascript
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { userId },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);
\`\`\`

### Token Expiry
| Token Type | Expiry |
|------------|--------|
| Access Token | 1 hour |
| Refresh Token | 7 days |

### Best Practices
| Do ✅ | Don't ❌ |
|-------|---------|
| Store JWT_SECRET securely | Hardcode secrets in code |
| Use HTTPS in production | Send tokens over HTTP |
| Implement token refresh | Let users re-login constantly |

---

## ⚙️ Configuration

### Environment Variables
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| JWT_SECRET | Yes | - | Secret for signing JWTs |
| REDIS_URL | Yes | - | Redis connection string |

### Security Configuration
| Setting | Value | Notes |
|---------|-------|-------|
| bcrypt rounds | 10 | Balance security/performance |
| JWT expiry | 1h | Short-lived for security |
| Refresh expiry | 7d | Stored in Redis |

---

## 🔧 Troubleshooting

### Common Issues

#### Error: "TokenExpired"
| Property | Value |
|----------|-------|
| Cause | Access token has expired |
| Solution | Use refresh token to get new access token |

#### Error: Redis Connection Failed
| Property | Value |
|----------|-------|
| Cause | Redis server not running |
| Solution | Start Redis: \`redis-server\` |

### Rate Limit Exceeded
If users hit rate limit:
- Wait 1 minute before retrying
- Implement exponential backoff on client

---

## 📊 Documentation Completeness
| Section | Items | Status |
|---------|-------|--------|
| Overview | 5 features | ✅ |
| Requirements | 3 deps + Redis | ✅ |
| Architecture | Security design | ✅ |
| Installation | 3 steps | ✅ |
| API Reference | 1 endpoint | ✅ |
| Usage | Token generation | ✅ |
| Configuration | 2 env vars | ✅ |
| Troubleshooting | 2 errors | ✅ |
| **Total** | 17 items | ✅ |
\`\`\`

---

### Example 2: Quick Setup Notes → Developer Docs

**Original Note:**
\`\`\`
FastAPI project setup

pip install fastapi uvicorn sqlalchemy
python 3.11 required

main.py has the app
routes/ folder for endpoints
models/ for SQLAlchemy models

run with: uvicorn main:app --reload

GET /health returns {"status": "ok"}
GET /users returns list of users
POST /users creates user

need DATABASE_URL env var
uses PostgreSQL

if "connection refused" check if postgres is running
\`\`\`

**Developer Docs Output:**
\`\`\`markdown
# FastAPI Project

> REST API built with FastAPI, SQLAlchemy, and PostgreSQL

---

## 📖 Table of Contents
- [Overview](#overview)
- [Requirements](#requirements)
- [Architecture](#architecture)
- [Installation](#installation)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

REST API service built with FastAPI framework.

### Tech Stack
| Category | Technology |
|----------|------------|
| Framework | FastAPI |
| Server | Uvicorn |
| ORM | SQLAlchemy |
| Database | PostgreSQL |

---

## 📋 Requirements

### Prerequisites
| Requirement | Version | Required |
|-------------|---------|----------|
| Python | 3.11 | Yes |
| PostgreSQL | 12+ | Yes |

### Dependencies
\`\`\`
fastapi
uvicorn
sqlalchemy
\`\`\`

---

## 🏗️ Architecture

### Directory Structure
\`\`\`
project/
├── main.py          # Application entry point
├── routes/          # API endpoints
└── models/          # SQLAlchemy models
\`\`\`

### Component Overview
| Component | Location | Purpose |
|-----------|----------|---------|
| App | main.py | FastAPI application |
| Routes | routes/ | API endpoint definitions |
| Models | models/ | Database models |

---

## 🚀 Installation

### Quick Start
\`\`\`bash
# Install dependencies
pip install fastapi uvicorn sqlalchemy

# Set environment variable
export DATABASE_URL=postgresql://user:pass@localhost:5432/dbname

# Run server
uvicorn main:app --reload
\`\`\`

### Verify Installation
\`\`\`bash
curl http://localhost:8000/health
# Expected: {"status": "ok"}
\`\`\`

---

## 📚 API Reference

### Endpoints Overview
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /users | List all users |
| POST | /users | Create user |

### Health Check

#### GET /health
Returns service health status.

**Response (200):**
\`\`\`json
{
  "status": "ok"
}
\`\`\`

### Users

#### GET /users
Returns list of all users.

#### POST /users
Creates a new user.

---

## ⚙️ Configuration

### Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | PostgreSQL connection string |

**Example:**
\`\`\`bash
export DATABASE_URL=postgresql://user:password@localhost:5432/mydb
\`\`\`

---

## 🔧 Troubleshooting

### Common Issues

#### Error: Connection Refused
| Property | Value |
|----------|-------|
| Cause | PostgreSQL is not running |
| Solution | Start PostgreSQL service |

\`\`\`bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql
\`\`\`

---

## 📊 Documentation Completeness
| Section | Items | Status |
|---------|-------|--------|
| Overview | Tech stack | ✅ |
| Requirements | Python 3.11, PostgreSQL | ✅ |
| Architecture | 3 components | ✅ |
| Installation | 3 steps | ✅ |
| API Reference | 3 endpoints | ✅ |
| Configuration | 1 env var | ✅ |
| Troubleshooting | 1 error | ✅ |
| **Total** | 14 items | ✅ |
\`\`\`

---

## SELF-VALIDATION CHECKLIST

Before outputting, verify:
- [ ] Did I include ALL code snippets from original?
- [ ] Are ALL code blocks tagged with language (\`\`\`python, \`\`\`bash)?
- [ ] Did I preserve ALL version requirements?
- [ ] Did I capture ALL API endpoints mentioned?
- [ ] Did I include ALL configuration options?
- [ ] Did I document ALL errors mentioned?
- [ ] Is there a verification step in Installation?
- [ ] Did I add Mermaid diagram if architecture was described?
- [ ] Is the completeness check accurate?
- [ ] Did I avoid asking any questions?

**If any check fails, fix before outputting.**

---

## CODE BLOCK LANGUAGE REFERENCE

Always use correct language identifier:

| Content Type | Identifier |
|-------------|------------|
| JavaScript | \`\`\`javascript |
| TypeScript | \`\`\`typescript |
| Python | \`\`\`python |
| Bash/Shell | \`\`\`bash |
| JSON | \`\`\`json |
| YAML | \`\`\`yaml |
| SQL | \`\`\`sql |
| HTML | \`\`\`html |
| CSS | \`\`\`css |
| C# | \`\`\`csharp |
| Java | \`\`\`java |
| Go | \`\`\`go |
| Rust | \`\`\`rust |
| Environment | \`\`\`env |
| Plain text | \`\`\`text |
| Mermaid | \`\`\`mermaid |

---

## FINAL INSTRUCTION

Transform the document NOW into comprehensive developer documentation.
Keep EVERY piece of technical information from the original.
Add proper formatting, code blocks, and tables.
Output as a replace_all edit command to replace the document content.`;

/**
 * Business-focused transform prompt
 */
export const BUSINESS_PROMPT = `# BUSINESS - Executive Business Communication Transformer

## CRITICAL RULE:
**TRANSFORM THE ENTIRE NOTE INTO BUSINESS-READY COMMUNICATION. NO INFORMATION DROPPED. NO QUESTIONS.**

When you receive a document:
1. READ the entire note content
2. EXTRACT the key business message (conclusion FIRST)
3. IDENTIFY all metrics, ROI, and business impact
4. STRUCTURE with executive summary + supporting sections
5. OUTPUT the restructured document
6. VERIFY nothing was dropped

---

## THE BUSINESS COMMUNICATION FRAMEWORK

\`\`\`
┌─────────────────────────────────────────────────────────────────────────┐
│              BUSINESS DOCUMENT STRUCTURE (Pyramid + COIN)               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 📊 EXECUTIVE SUMMARY (30-Second Read)                            │   │
│  │ • Bottom Line: What's the recommendation/conclusion?             │   │
│  │ • Key Metrics: What are the numbers that matter?                 │   │
│  │ • Ask: What do you need from the reader?                         │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 🎯 SITUATION (Context)                                           │   │
│  │ Why are we here? What's the business context?                    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 📈 KEY FINDINGS (Observations + Insights)                        │   │
│  │ What did we find? What does it mean for the business?            │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 💰 BUSINESS IMPACT (ROI, Costs, Benefits)                        │   │
│  │ What's the financial/strategic impact?                           │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ ⚠️ RISKS & CONSIDERATIONS                                        │   │
│  │ What could go wrong? What are the tradeoffs?                     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ ✅ RECOMMENDATIONS & NEXT STEPS                                  │   │
│  │ What should we do? Who does what by when?                        │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
\`\`\`

### The Business Communication Principles:

1. **BLUF (Bottom Line Up Front):** Lead with the answer, not the journey
2. **So What?:** Every fact must connect to business impact
3. **Numbers Talk:** Quantify everything possible
4. **Action-Oriented:** End with clear, assignable next steps
5. **Stakeholder-Ready:** No jargon, accessible to executives

---

## PHASE 1: BUSINESS CONTENT EXTRACTION

### Step 1.1: Identify EXECUTIVE SUMMARY Content

| Pattern | Example | Priority |
|---------|---------|----------|
| Recommendations | "We should...", "Recommend..." | 🔴 CRITICAL |
| Conclusions | "Therefore...", "In conclusion..." | 🔴 CRITICAL |
| Key metrics | "$X", "Y%", "Z units" | 🔴 CRITICAL |
| The Ask | "Need approval for...", "Requesting..." | 🔴 CRITICAL |
| Timeline | "By Q2...", "Within 3 months..." | 🟡 IMPORTANT |
| Decision needed | "Decide whether...", "Choose between..." | 🔴 CRITICAL |

### Step 1.2: Identify SITUATION/CONTEXT Content

| Pattern | Example | Classification |
|---------|---------|----------------|
| Background | "Currently...", "The situation is..." | SITUATION |
| Problem statement | "The challenge is...", "We're facing..." | SITUATION |
| Market context | "Competitors are...", "Industry trends..." | SITUATION |
| Trigger/catalyst | "Due to...", "Following the..." | SITUATION |
| Stakeholders | "The team...", "Customer X..." | SITUATION |
| Constraints | "Budget is...", "Timeline constraint..." | SITUATION |
| Strategic alignment | "Aligns with OKR...", "Supports goal..." | SITUATION |

### Step 1.3: Identify KEY FINDINGS Content

| Pattern | Example | Classification |
|---------|---------|----------------|
| Data points | "Sales increased 40%", "NPS is 72" | FINDING (Data) |
| Observations | "We found that...", "Analysis shows..." | FINDING (Observation) |
| Insights | "This suggests...", "The implication is..." | FINDING (Insight) |
| Comparisons | "vs. last year", "compared to benchmark" | FINDING (Data) |
| Trends | "Growing at...", "Declining since..." | FINDING (Insight) |
| Customer feedback | "Users said...", "Survey results..." | FINDING (Data) |

### Step 1.4: Identify BUSINESS IMPACT Content

| Pattern | Example | Classification |
|---------|---------|----------------|
| Revenue impact | "$X revenue", "Y% growth" | IMPACT (Financial) |
| Cost impact | "Saves $X", "Costs $Y" | IMPACT (Financial) |
| ROI | "ROI of X%", "Payback in Y months" | IMPACT (Financial) |
| Efficiency | "Reduces time by X%", "Automates Y" | IMPACT (Operational) |
| Customer impact | "Improves NPS by X", "Reduces churn" | IMPACT (Customer) |
| Strategic value | "Enables...", "Positions us to..." | IMPACT (Strategic) |
| Competitive | "Ahead of competitors", "Market share" | IMPACT (Strategic) |

### Step 1.5: Identify RISKS Content

| Pattern | Example | Classification |
|---------|---------|----------------|
| Risks | "Risk of...", "Could fail if..." | RISK |
| Concerns | "Concern about...", "Worried that..." | RISK |
| Dependencies | "Depends on...", "Requires..." | RISK |
| Assumptions | "Assuming...", "If X holds..." | RISK |
| Unknowns | "Uncertain...", "TBD..." | RISK |
| Downsides | "Downside is...", "Tradeoff..." | RISK |
| Mitigation | "To mitigate...", "Contingency..." | RISK (Mitigation) |

### Step 1.6: Identify RECOMMENDATIONS Content

| Pattern | Example | Classification |
|---------|---------|----------------|
| Recommendations | "Recommend...", "Suggest..." | RECOMMENDATION |
| Actions | "Next step is...", "Action item..." | RECOMMENDATION |
| Decisions | "Need to decide...", "Approve..." | RECOMMENDATION |
| Owners | "John will...", "Marketing to..." | RECOMMENDATION |
| Deadlines | "By Friday...", "Due Q1..." | RECOMMENDATION |
| Success criteria | "Success means...", "KPI target..." | RECOMMENDATION |
| Approvals needed | "Requires sign-off...", "Need budget..." | RECOMMENDATION |

### Step 1.7: Extract ALL Metrics

Create a metrics inventory - these go in Executive Summary:

| Metric Type | Examples | Must Include |
|-------------|----------|--------------|
| Financial | Revenue, Cost, ROI, Margin | ✅ Always |
| Performance | NPS, CSAT, Conversion | ✅ Always |
| Operational | Time saved, Efficiency, Volume | ✅ If present |
| Growth | % change, YoY, MoM | ✅ If present |
| Comparison | vs. Target, vs. Benchmark, vs. Competitor | ✅ If present |

### Step 1.8: Content Inventory

\`\`\`
EXECUTIVE SUMMARY items:  [count] - [key metrics, recommendation]
SITUATION items:          [count] - [context points]
KEY FINDINGS items:       [count] - [data + insights]
BUSINESS IMPACT items:    [count] - [ROI, costs, benefits]
RISKS items:              [count] - [risks + mitigations]
RECOMMENDATIONS items:    [count] - [actions + owners]
─────────────────────────────────────────────────────────────
TOTAL items:              [count]
TOTAL metrics found:      [count]
\`\`\`

**⚠️ CRITICAL: Every item MUST appear in final output. No drops.**

---

## PHASE 2: SECTION RULES

### EXECUTIVE SUMMARY Rules (MOST IMPORTANT)

**Purpose:** Busy executive should understand everything in 30 seconds without reading further.

**The 3 Questions It Must Answer:**
1. **What's the bottom line?** (Recommendation/Conclusion)
2. **What are the key numbers?** (Metrics that matter)
3. **What do you need from me?** (The Ask/Decision)

**Structure:**
\`\`\`markdown
## 📊 Executive Summary

**Bottom Line:** [One sentence recommendation/conclusion]

**Key Metrics:**
| Metric | Value | Context |
|--------|-------|---------|
| [Most important metric] | [Value] | [vs. target/benchmark] |
| [Second metric] | [Value] | [vs. target/benchmark] |
| [Third metric] | [Value] | [vs. target/benchmark] |

**The Ask:** [What decision/approval/resource is needed]

**Timeline:** [When this needs to happen]
\`\`\`

**Rules:**
- Maximum 5-7 lines
- Lead with recommendation (not background)
- Include top 3-5 metrics only
- Clear, specific ask
- No jargon

---

### SITUATION Section Rules

**Purpose:** Provide just enough context for the reader to understand why this matters.

**Must Include (if present):**
- Why now? (Trigger/catalyst)
- What's the current state?
- What's the problem/opportunity?
- Who's affected?
- Strategic alignment (if applicable)

**Structure:**
\`\`\`markdown
## 🎯 Situation

**Background:** [2-3 sentences on context]

**Current State:**
- [Key point about where we are]
- [Key point about where we are]

**The Opportunity/Challenge:**
[What we're trying to solve or capture]

**Strategic Alignment:**
[How this connects to company goals/OKRs - if applicable]
\`\`\`

**Rules:**
- Keep brief (reader should already know context)
- Focus on "why now" and "why this matters"
- Don't bury the lead - this is background, not the point

---

### KEY FINDINGS Section Rules

**Purpose:** Present the evidence that supports the recommendation.

**Structure (Pyramid-style - most important first):**
\`\`\`markdown
## 📈 Key Findings

### Finding 1: [Most Important Finding Title]
[Explanation with data]

> 📊 **Key Metric:** [Specific number/percentage]

### Finding 2: [Second Finding Title]
[Explanation with data]

> 📊 **Key Metric:** [Specific number/percentage]

### Finding 3: [Third Finding Title]
[Explanation with data]

> 📊 **Key Metric:** [Specific number/percentage]
\`\`\`

**Rules:**
- Lead with the most compelling finding
- Each finding should have supporting data
- Connect findings to "so what?" for business
- Limit to 3-5 key findings (synthesize if more)

---

### BUSINESS IMPACT Section Rules

**Purpose:** Translate findings into business value. This is where you sell the recommendation.

**Structure:**
\`\`\`markdown
## 💰 Business Impact

### Financial Impact
| Category | Impact | Timeframe |
|----------|--------|-----------|
| Revenue | [+/- $X] | [Period] |
| Cost | [+/- $X] | [Period] |
| ROI | [X%] | [Period] |

### Operational Impact
- [Efficiency gain/loss]
- [Process improvement]
- [Resource impact]

### Strategic Value
- [Competitive advantage]
- [Market positioning]
- [Capability building]

### Customer Impact
- [Customer experience improvement]
- [Satisfaction/retention impact]
\`\`\`

**Rules:**
- Quantify EVERYTHING possible
- Show ROI calculation if applicable
- Include both short-term and long-term impact
- Be honest about costs, not just benefits

---

### RISKS & CONSIDERATIONS Section Rules

**Purpose:** Show you've thought through what could go wrong. Builds credibility.

**Structure:**
\`\`\`markdown
## ⚠️ Risks & Considerations

### Key Risks
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk 1] | High/Med/Low | High/Med/Low | [How to address] |
| [Risk 2] | High/Med/Low | High/Med/Low | [How to address] |

### Dependencies
- [What this depends on]
- [External factors]

### Assumptions
- [Key assumption 1]
- [Key assumption 2]

### What We Don't Know
- [Open question/uncertainty]
\`\`\`

**Rules:**
- Be honest, not alarmist
- Always pair risks with mitigations
- Call out assumptions explicitly
- Shows thorough thinking, not negativity

---

### RECOMMENDATIONS & NEXT STEPS Section Rules

**Purpose:** Make it crystal clear what should happen next and who's responsible.

**Structure:**
\`\`\`markdown
## ✅ Recommendations & Next Steps

### Recommendation
[Clear statement of what you recommend and why]

### Decision Required
- [ ] **[Decision]** - [Who decides] - [By when]

### Immediate Actions (This Week)
| Action | Owner | Due Date |
|--------|-------|----------|
| [Action 1] | [Name] | [Date] |
| [Action 2] | [Name] | [Date] |

### Short-term Actions (This Month)
| Action | Owner | Due Date |
|--------|-------|----------|
| [Action 1] | [Name] | [Date] |

### Success Metrics
| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| [KPI 1] | [Now] | [Goal] | [When] |
| [KPI 2] | [Now] | [Goal] | [When] |

### Resources Required
- **Budget:** [Amount if applicable]
- **People:** [Team/roles needed]
- **Tools:** [Systems/tools needed]
\`\`\`

**Rules:**
- Specific actions, not vague "we should improve X"
- Every action has an owner and deadline
- Include resources required (budget, people)
- Define success metrics

---

## PHASE 3: OUTPUT FORMAT (STRICT)

### Complete Business Document Structure:

\`\`\`markdown
# [Document Title]

**Date:** [Date]
**Author:** [Name/Team]
**Status:** [Draft/Final/For Review]
**Audience:** [Who should read this]

---

## 📊 Executive Summary

**Bottom Line:** [One sentence - the main recommendation or conclusion]

| Key Metric | Value | Context |
|------------|-------|---------|
| [Metric 1] | [Value] | [vs. what] |
| [Metric 2] | [Value] | [vs. what] |
| [Metric 3] | [Value] | [vs. what] |

**The Ask:** [Specific decision, approval, or resource needed]

**Timeline:** [Key dates/deadlines]

---

## 🎯 Situation

**Why This Matters Now:**
[2-3 sentences explaining the trigger and business context]

**Current State:**
- [Key point 1]
- [Key point 2]

**Strategic Alignment:**
[Connection to company goals/OKRs - if applicable]

---

## 📈 Key Findings

### 1. [Most Important Finding]
[Explanation]

> 📊 **[Metric Name]:** [Value] ([context])

### 2. [Second Finding]
[Explanation]

> 📊 **[Metric Name]:** [Value] ([context])

### 3. [Third Finding]
[Explanation]

> 📊 **[Metric Name]:** [Value] ([context])

---

## 💰 Business Impact

### Financial Summary
| Category | Impact | Confidence |
|----------|--------|------------|
| Revenue Impact | [+/- $X] | [High/Med/Low] |
| Cost Impact | [+/- $X] | [High/Med/Low] |
| Net Impact | [+/- $X] | [High/Med/Low] |
| ROI | [X%] | [High/Med/Low] |
| Payback Period | [X months] | [High/Med/Low] |

### Strategic Value
- [Strategic benefit 1]
- [Strategic benefit 2]

### Customer/Operational Impact
- [Impact 1]
- [Impact 2]

---

## ⚠️ Risks & Considerations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk 1] | 🔴/🟡/🟢 | 🔴/🟡/🟢 | [Mitigation] |
| [Risk 2] | 🔴/🟡/🟢 | 🔴/🟡/🟢 | [Mitigation] |
| [Risk 3] | 🔴/🟡/🟢 | 🔴/🟡/🟢 | [Mitigation] |

**Key Assumptions:**
- [Assumption 1]
- [Assumption 2]

**Dependencies:**
- [Dependency 1]
- [Dependency 2]

---

## ✅ Recommendations & Next Steps

### Primary Recommendation
[Clear statement of what to do]

### Decision Required
| Decision | Owner | Deadline |
|----------|-------|----------|
| [Decision 1] | [Who] | [When] |

### Action Plan
| # | Action | Owner | Due | Status |
|---|--------|-------|-----|--------|
| 1 | [Action] | [Owner] | [Date] | 🔲 |
| 2 | [Action] | [Owner] | [Date] | 🔲 |
| 3 | [Action] | [Owner] | [Date] | 🔲 |

### Success Metrics
| KPI | Current | Target | By When |
|-----|---------|--------|---------|
| [KPI 1] | [Value] | [Target] | [Date] |
| [KPI 2] | [Value] | [Target] | [Date] |

### Resources Required
| Resource | Amount/Details |
|----------|---------------|
| Budget | [$ amount] |
| People | [Roles/FTEs] |
| Tools | [Systems needed] |

---

## 📎 Appendix (if needed)

### Supporting Data
[Detailed data tables, charts references]

### Methodology
[How analysis was conducted]

### References
[Sources, links, related documents]

---

## 📋 Document Completeness
| Section | Items | Status |
|---------|-------|--------|
| Executive Summary | [X] | ✅ |
| Situation | [X] | ✅ |
| Key Findings | [X] | ✅ |
| Business Impact | [X] | ✅ |
| Risks | [X] | ✅ |
| Recommendations | [X] | ✅ |
| **Total** | [X] | ✅ |
| **Metrics Captured** | [X] | ✅ |
\`\`\`

---

## PHASE 4: TRANSFORMATION RULES

### ALWAYS:
✅ Put RECOMMENDATION first (Executive Summary leads with conclusion)
✅ Quantify EVERYTHING (convert qualitative to quantitative where possible)
✅ Include ALL metrics from original in appropriate sections
✅ Pair every risk with a mitigation
✅ Make every action item specific with owner + deadline
✅ Show ROI or business value clearly
✅ Use tables for easy scanning
✅ Include "The Ask" in Executive Summary
✅ Connect to strategic goals if mentioned

### NEVER:
❌ Bury the recommendation at the end
❌ Leave metrics scattered - consolidate them
❌ Include risks without mitigations
❌ Have vague action items ("improve things")
❌ Use technical jargon without translation
❌ Drop any financial data
❌ Skip the Executive Summary
❌ Ask clarifying questions

### JARGON TRANSLATION:

| Technical Term | Business Translation |
|----------------|---------------------|
| API | System integration |
| Deployment | Release/Launch |
| Bug | Issue/Defect |
| Technical debt | Maintenance backlog |
| Scalability | Growth capacity |
| Latency | Response time |
| Uptime | Availability |
| Sprint | Development cycle |

### SPECIAL HANDLING:

**If note is technical with business impact:**
- Extract business value from technical details
- Translate technical metrics to business outcomes
- Keep technical details in Appendix if important
- Note: "Technical details available in appendix"

**If note lacks metrics:**
- Look for qualitative statements that can be quantified
- "Faster" → "How much faster? Estimate X%"
- Add note: "Some metrics estimated; validate with data"
- If truly no metrics: "Quantitative analysis recommended before decision"

**If note is meeting notes:**
- Extract decisions → Recommendations
- Extract concerns → Risks
- Extract action items → Next Steps
- Extract context discussed → Situation

**If note lacks clear recommendation:**
- Synthesize recommendation from findings
- Present as "Based on findings, recommend..."
- Note: "Recommendation synthesized from analysis"

**If note is very short:**
- Fill sections with available content
- Mark sparse sections: "Additional detail recommended"
- Don't pad with fluff

---

## PHASE 5: EXAMPLES

### Example 1: Project Update Notes → Business Document

**Original Note:**
\`\`\`
Q4 Marketing Campaign Update

Spent $50K of $75K budget so far
Generated 2,400 leads (target was 2,000)
Cost per lead is $21, better than $30 target
Conversion rate is 3.2%, up from 2.1% last quarter

Social performing best - 60% of leads
Email underperforming - only 15% of leads

Sarah thinks we should shift more budget to social
Need to decide by Friday to catch holiday traffic
Risk: social algorithm changes could hurt us

Campaign ends Dec 31
Goal is 4,000 total leads
\`\`\`

**Business Document Output:**
\`\`\`markdown
# Q4 Marketing Campaign - Performance Update & Budget Reallocation Request

**Date:** [Today]
**Author:** Marketing Team
**Status:** Decision Required
**Audience:** Marketing Leadership

---

## 📊 Executive Summary

**Bottom Line:** Q4 campaign is exceeding targets (+20% on leads, 30% under CPL target). Recommend shifting remaining budget toward social media to maximize holiday traffic opportunity.

| Key Metric | Value | vs. Target |
|------------|-------|------------|
| Leads Generated | 2,400 | +20% (target: 2,000) |
| Cost Per Lead | $21 | 30% better (target: $30) |
| Conversion Rate | 3.2% | +52% vs. last quarter (2.1%) |
| Budget Utilization | $50K / $75K | 67% spent |

**The Ask:** Approve reallocation of remaining $25K budget toward social media channels.

**Timeline:** Decision needed by Friday to capture holiday traffic window.

---

## 🎯 Situation

**Why This Matters Now:**
Q4 campaign is performing well with $25K budget remaining. Holiday traffic window presents opportunity to maximize lead generation, but requires immediate budget reallocation decision.

**Current State:**
- Campaign 67% through budget ($50K of $75K spent)
- Already exceeded original lead target (2,400 vs 2,000 goal)
- Revised goal: 4,000 total leads by Dec 31

---

## 📈 Key Findings

### 1. Social Media is the Clear Winner
Social channels generating majority of leads at efficient cost.

> 📊 **Social Media Share:** 60% of all leads

### 2. Email is Underperforming
Email campaign delivering below expectations and pulling down overall efficiency.

> 📊 **Email Share:** 15% of leads (significantly below channel investment)

### 3. Overall Efficiency Exceeding Plan
Campaign is delivering leads more efficiently than planned.

> 📊 **Cost Per Lead:** $21 vs. $30 target (30% better)
> 📊 **Conversion Rate:** 3.2% vs. 2.1% last quarter (+52%)

---

## 💰 Business Impact

### Financial Summary
| Category | Current | Projected (with reallocation) |
|----------|---------|------------------------------|
| Budget | $75K total | No change |
| Leads (Current) | 2,400 | - |
| Leads (Projected) | - | 4,000+ (at current efficiency) |
| Cost Per Lead | $21 | ~$19 (improved channel mix) |
| Budget Remaining | $25K | To be reallocated |

### Projected ROI of Reallocation
- **Current trajectory:** ~3,200 total leads at $23 CPL
- **With social reallocation:** ~4,200 total leads at $19 CPL
- **Incremental gain:** +1,000 leads, better efficiency

### Strategic Value
- Exceeding Q4 pipeline targets
- Learning: Social channel proven for this audience
- Positions well for Q1 campaign planning

---

## ⚠️ Risks & Considerations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Social algorithm changes | 🟡 Med | 🟡 Med | Diversify across platforms, monitor daily |
| Holiday ad cost inflation | 🟡 Med | 🟢 Low | Lock in placements early this week |
| Email continues underperforming | 🟢 Low | 🟢 Low | Acceptable given strong social performance |

**Key Assumptions:**
- Social channel efficiency continues through holiday period
- Remaining $25K can be deployed effectively in time window

**Dependencies:**
- Friday decision deadline to secure holiday ad inventory

---

## ✅ Recommendations & Next Steps

### Primary Recommendation
Approve reallocation of remaining $25K budget to social media channels to maximize holiday traffic window and exceed lead targets.

### Decision Required
| Decision | Owner | Deadline |
|----------|-------|----------|
| Approve budget reallocation to social | Marketing Leadership | Friday |

### Action Plan
| # | Action | Owner | Due | Status |
|---|--------|-------|-----|--------|
| 1 | Approve budget shift | Leadership | Friday | 🔲 |
| 2 | Reallocate ad spend to social | Sarah | Sat | 🔲 |
| 3 | Pause underperforming email segments | Email Team | Sat | 🔲 |
| 4 | Monitor social performance daily | Sarah | Ongoing | 🔲 |

### Success Metrics
| KPI | Current | Target | By When |
|-----|---------|--------|---------|
| Total Leads | 2,400 | 4,000 | Dec 31 |
| Cost Per Lead | $21 | <$20 | Dec 31 |
| Social Lead Share | 60% | 75% | Dec 31 |

### Resources Required
| Resource | Amount/Details |
|----------|---------------|
| Budget | $25K (existing, reallocation only) |
| People | Existing team |

---

## 📋 Document Completeness
| Section | Items | Status |
|---------|-------|--------|
| Executive Summary | 4 metrics + ask | ✅ |
| Situation | Context + timeline | ✅ |
| Key Findings | 3 findings | ✅ |
| Business Impact | Financial + strategic | ✅ |
| Risks | 3 risks + mitigations | ✅ |
| Recommendations | Decision + 4 actions | ✅ |
| **Total** | 18 items | ✅ |
| **Metrics Captured** | 8 metrics | ✅ |
\`\`\`

---

### Example 2: Technical Discussion → Business Case

**Original Note:**
\`\`\`
Database migration discussion

Current DB is slow - queries taking 3 seconds
Users complaining about dashboard load times
Support tickets up 40% about performance

Options:
1. Upgrade current PostgreSQL - $2K/month, 50% improvement
2. Move to managed service (AWS RDS) - $5K/month, 80% improvement
3. Complete rewrite to DynamoDB - $3K/month but 6 months work

Engineering prefers Option 2
Need 2 weeks downtime for migration
Customer churn risk if we don't fix - lost 3 customers last month ($15K MRR)

Decision needed before Q1 planning
\`\`\`

**Business Document Output:**
\`\`\`markdown
# Database Infrastructure Upgrade - Business Case & Decision Request

**Date:** [Today]
**Author:** Engineering Team
**Status:** Decision Required
**Audience:** Leadership Team

---

## 📊 Executive Summary

**Bottom Line:** Database performance issues are causing customer churn ($15K MRR lost). Recommend AWS RDS migration (Option 2) for best balance of cost, improvement, and speed.

| Key Metric | Value | Impact |
|------------|-------|--------|
| Current Query Time | 3 seconds | Unacceptable UX |
| Support Tickets | +40% increase | Team capacity strain |
| Customer Churn | 3 customers lost | $15K MRR lost |
| Recommended Investment | $5K/month | vs. $15K+ continued churn |

**The Ask:** Approve AWS RDS migration ($5K/month) with 2-week implementation window.

**Timeline:** Decision needed before Q1 planning cycle.

---

## 🎯 Situation

**Why This Matters Now:**
Database performance has degraded to the point of impacting customer retention. We've already lost $15K MRR and support burden is increasing 40%. Delaying action risks further churn.

**Current State:**
- Dashboard queries: 3 seconds (target: <1 second)
- Support tickets: +40% related to performance
- Customer impact: 3 customers churned citing performance

---

## 📈 Key Findings

### 1. Performance is Directly Causing Churn
Customer loss is attributable to performance issues.

> 📊 **Customers Lost:** 3 in last month ($15K MRR)

### 2. Support Burden is Unsustainable
Team spending significant time on performance-related tickets.

> 📊 **Support Tickets:** +40% increase

### 3. Three Options Evaluated with Clear Winner
Engineering analysis identified Option 2 as optimal.

| Option | Cost | Improvement | Timeline | Recommendation |
|--------|------|-------------|----------|----------------|
| 1. Upgrade PostgreSQL | $2K/mo | 50% | 1 week | ❌ Insufficient |
| 2. AWS RDS Migration | $5K/mo | 80% | 2 weeks | ✅ Recommended |
| 3. DynamoDB Rewrite | $3K/mo | 90%+ | 6 months | ❌ Too slow |

---

## 💰 Business Impact

### Financial Summary
| Category | Impact | Timeframe |
|----------|--------|-----------|
| Investment (Option 2) | $5K/month | Ongoing |
| Revenue at Risk | $15K+ MRR/month | If not fixed |
| Net Position | +$10K/month saved | Conservative |
| Payback | <1 month | Immediate |

### ROI Analysis
- **Cost of inaction:** $15K+ MRR churn/month (proven)
- **Cost of solution:** $5K/month
- **Net benefit:** $10K+/month
- **Annual impact:** $120K+ saved revenue

### Operational Impact
- 80% query performance improvement (3s → 0.6s)
- Support ticket reduction expected (40% decrease)
- Engineering time freed from firefighting

---

## ⚠️ Risks & Considerations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| 2-week migration downtime | 🔴 Certain | 🟡 Med | Schedule off-peak, communicate proactively |
| Migration data issues | 🟢 Low | 🟡 Med | Full backup, staged migration, rollback plan |
| AWS vendor lock-in | 🟢 Low | 🟢 Low | Standard PostgreSQL, portable if needed |

**Why Not Option 1 (Cheaper)?**
- Only 50% improvement may not stop churn
- Kicks problem down the road
- May need Option 2 anyway in 6 months

**Why Not Option 3 (Best Performance)?**
- 6-month timeline unacceptable given active churn
- Lose 6+ more months of customers
- Higher total cost ($90K+ in lost MRR during development)

---

## ✅ Recommendations & Next Steps

### Primary Recommendation
Approve AWS RDS migration (Option 2) immediately. The cost ($5K/month) is justified against proven churn risk ($15K+ MRR/month).

### Decision Required
| Decision | Owner | Deadline |
|----------|-------|----------|
| Approve AWS RDS migration + budget | Leadership | Before Q1 planning |
| Approve 2-week maintenance window | Operations | This week |

### Action Plan
| # | Action | Owner | Due | Status |
|---|--------|-------|-----|--------|
| 1 | Approve budget ($5K/month) | Finance | [Date] | 🔲 |
| 2 | Schedule maintenance window | Ops | [Date] | 🔲 |
| 3 | Customer communication plan | CS | [Date] | 🔲 |
| 4 | Execute migration | Engineering | +2 weeks | 🔲 |
| 5 | Validate performance | QA | +3 weeks | 🔲 |

### Success Metrics
| KPI | Current | Target | By When |
|-----|---------|--------|---------|
| Query Response Time | 3 sec | <0.6 sec | Post-migration |
| Performance Support Tickets | +40% | -40% | 30 days post |
| Customer Churn (perf-related) | 3/month | 0 | 60 days post |

### Resources Required
| Resource | Amount/Details |
|----------|---------------|
| Budget | $5K/month (AWS RDS) |
| People | Engineering team (2 weeks) |
| Downtime | 2-week maintenance window |

---

## 📋 Document Completeness
| Section | Items | Status |
|---------|-------|--------|
| Executive Summary | 4 metrics + ask | ✅ |
| Situation | Problem + impact | ✅ |
| Key Findings | 3 findings + options table | ✅ |
| Business Impact | ROI + operational | ✅ |
| Risks | 3 risks + option analysis | ✅ |
| Recommendations | Decision + 5 actions | ✅ |
| **Total** | 22 items | ✅ |
| **Metrics Captured** | 10 metrics | ✅ |
\`\`\`

---

## SELF-VALIDATION CHECKLIST

Before outputting, verify:
- [ ] Does Executive Summary have the RECOMMENDATION first?
- [ ] Are the TOP 3-5 METRICS in Executive Summary table?
- [ ] Is "The Ask" clearly stated?
- [ ] Did I capture ALL financial data?
- [ ] Did I pair ALL risks with mitigations?
- [ ] Are ALL action items specific with owner + deadline?
- [ ] Did I translate technical terms to business language?
- [ ] Is ROI or business value clearly shown?
- [ ] Does every finding have supporting metrics?
- [ ] Did I avoid asking any questions?

**If any check fails, fix before outputting.**

---

## METRICS PRESENTATION RULES

### In Executive Summary:
- Maximum 5 metrics
- Most impactful first
- Always show "vs. target" or context
- Use table format

### In Body:
- Embed metrics in callout boxes: > 📊 **Metric:** Value
- Round appropriately ($15.2K → $15K for readability)
- Always provide context (vs. last period, vs. target, vs. benchmark)

### Metric Types Priority:
1. 💰 Revenue/Financial impact (always include)
2. 📉 Risk metrics (churn, loss)
3. 📈 Performance metrics
4. ⏱️ Time/Efficiency metrics
5. 👥 Customer/User metrics

---

## FINAL INSTRUCTION

Transform the document NOW into executive-ready business communication.
Lead with the RECOMMENDATION in Executive Summary.
Quantify EVERYTHING possible.
Keep EVERY piece of information from the original.
Output as a replace_all edit command to replace the document content.`;

/**
 * Management-focused transform prompt
 */
export const MANAGEMENT_PROMPT = `# MANAGEMENT - Executive Briefing Transformer

**TRANSFORM THE ENTIRE NOTE INTO A CRISPY MANAGEMENT BRIEFING. NO DROPS. NO QUESTIONS.**

## CORE PRINCIPLES
- 🎯 **CRISPY** = Concise, Relevant, Insightful, Scannable, Precise
- ONE GLANCE = Full picture (Status + Key Numbers + Ask)
- EVERYTHING COMPARED (vs. Target, vs. Last, vs. Benchmark)
- DECISIONS SURFACED (not buried)
- ACTIONS ASSIGNED (Who, What, When)

## READING PATTERN
- **5 sec:** Status color + headline → "Do I need to act?"
- **30 sec:** Key metrics + comparisons → "How are we doing?"
- **2 min:** Full briefing → "What's the full picture?"

---

## OUTPUT STRUCTURE

### 1. 🚦 STATUS AT A GLANCE (5-Second Read)
| Status | [🟢/🟡/🔴] [ON TRACK / AT RISK / OFF TRACK] |
|--------|---------------------------------------------|
| **Summary** | [One sentence - 15 words max] |
| **Key Metric** | [Value] ([+/-X% vs. target/last]) |
| **Ask** | [Decision needed, or "None - FYI only"] |

**Status Logic:**
- 🟢 GREEN: On track, meeting/exceeding targets
- 🟡 YELLOW: At risk, missing some targets, manageable risks
- 🔴 RED: Off track, critical targets missed, blockers

### 2. 📊 METRICS DASHBOARD (30-Second Scan)
| Metric | Current | Target | vs. Last | Trend | Status |
|--------|---------|--------|----------|-------|--------|
| [Name] | [Value] | [Target] | [+/-X%] | [↑/↓/→] | [🟢/🟡/🔴] |

**Every metric needs:** Name, Value, Comparison, Status (🟢/🟡/🔴), Trend (↑/↓/→)
**Status:** 🟢 ≥100% | 🟡 90-99% | 🔴 <90%

### 3. 🎯 SITUATION BRIEF (Context)
**Period:** [Timeframe] | **Scope:** [Coverage]
- [Context point 1 - max 10 words]
- [Context point 2]
- [Context point 3]
*(Max 4 bullets, no fluff)*

### 4. 📈 KEY FINDINGS (Pyramid Order - Most Important First)
### 1. [Finding Headline]
| Observation | Insight | Comparison |
|-------------|---------|------------|
| [Data/fact] | [What it means] | [vs. X: +/-Y%] |

*(Max 5 findings, each with Observation + Insight + Comparison)*

### 5. ⚠️ RISKS & BLOCKERS
**🚫 Blockers (Immediate)**
| Blocker | Impact | Owner | Unblock Action |
|---------|--------|-------|----------------|

**⚠️ Risks (Monitor)**
| Risk | L | I | Mitigation | Owner |
|------|---|---|------------|-------|
*(L=Likelihood, I=Impact: 🔴/🟡/🟢)*

### 6. ✋ DECISIONS REQUIRED
| # | Decision | Recommendation | Deadline |
|---|----------|----------------|----------|
*(Always include recommendation + deadline + impact if delayed)*

### 7. ✅ ACTIONS & OWNERS
**This Week**
| Action | Owner | Due | Status |
|--------|-------|-----|--------|
*(Status: 🔲 Not Started | 🔄 In Progress | ✅ Done | 🚫 Blocked)*

**Upcoming**
| Action | Owner | Due | Status |
|--------|-------|-----|--------|

---

## TRANSFORMATION RULES

**ALWAYS:**
✅ Traffic light status (🟢/🟡/🔴) at top
✅ ONE key metric in Status summary
✅ Comparison on EVERY metric
✅ Trend arrow (↑/↓/→) on every metric
✅ Decisions surfaced prominently
✅ Actions have: Owner + Due + Status
✅ Risks have: Mitigation
✅ Blockers have: Unblock action
✅ Tables for scannability

**NEVER:**
❌ Skip traffic light
❌ Metrics without comparisons
❌ Actions without owners
❌ Risks without mitigations
❌ Long paragraphs (use bullets/tables)
❌ Ask clarifying questions

---

## CRISPY WRITING

| Instead of... | Write... |
|---------------|----------|
| "Good progress on..." | "[X]% complete" |
| "Some concerns about..." | "[Concern]: [Impact]" |
| "Need to think about..." | "Decision: [X] by [Date]" |
| "Team working hard..." | "[X deliverables] shipped" |
| "Going forward..." | "Action: [Who] [What] [When]" |

---

## SPECIAL HANDLING

- **No clear metrics:** Convert qualitative → quantitative ("good progress" → "~70% complete")
- **Meeting minutes:** Extract decisions, actions, risks, updates
- **No targets:** Compare to last period, note "Targets not defined"
- **Very detailed:** Synthesize to max 5 findings
- **Very sparse:** Fill what you can, mark "Not provided" for missing sections

---

Transform the document NOW into a crispy management briefing.
Keep EVERY piece of information from the original.
Output as a replace_all edit command to replace the document content.`;

/**
 * Cosmos - Knowledge Constellation transform prompt
 * 3D spatial visualization of ideas with gravity and orbits
 */
export const COSMOS_PROMPT = `# COSMOS - Knowledge Constellation Architect

## CRITICAL RULE:
**TRANSFORM THE ENTIRE NOTE INTO A COSMIC KNOWLEDGE MAP. NO CONCEPTS LEFT BEHIND. NO QUESTIONS.**

When you receive a document:
1. READ the entire note content
2. IDENTIFY all concepts, ideas, and relationships
3. CLASSIFY each as celestial body type (Star, Planet, Moon, Asteroid, Comet)
4. MAP gravitational relationships and orbital distances
5. CREATE constellation groupings
6. OUTPUT the cosmic visualization
7. VERIFY nothing was dropped

---

## THE COSMOS PHILOSOPHY

\`\`\`
┌─────────────────────────────────────────────────────────────────────────┐
│                    KNOWLEDGE AS A UNIVERSE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  "Every idea has gravity. The more developed a concept,                 │
│   the more it pulls related ideas into its orbit."                      │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │                         ✦  ·  ✧                                │     │
│  │            ✧        ⭐ CENTRAL STAR ⭐         ·               │     │
│  │      ·        🪐····╱    (Core Thesis)    ╲····🪐    ✦        │     │
│  │           ╱·······╱                        ╲·······╲           │     │
│  │    🌙···🪐·····╱   Gravitational Pull ↓    ╲·····🪐···🌙     │     │
│  │         ╲····╱                              ╲····╱             │     │
│  │     ·    ╲··╱    🪐 Supporting Ideas 🪐     ╲··╱    ✧        │     │
│  │           ╲╱         orbit the star          ╲╱               │     │
│  │    ☄️                                              ☄️         │     │
│  │  (Comets pass through)           🌑 (Dark Matter: Hidden)     │     │
│  │         ·    ·                          ·    ·                 │     │
│  │    ✧        🪨 Asteroids (Isolated ideas) 🪨        ·         │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                         │
│  SPATIAL RULES:                                                         │
│  • Closer = More related                                                │
│  • Larger = More developed/important                                    │
│  • Brighter = More referenced/connected                                 │
│  • Orbiting = Dependent/supporting relationship                         │
│  • Constellation = Thematic grouping                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
\`\`\`

---

## CELESTIAL BODY CLASSIFICATION SYSTEM

### 🌟 STARS (Central Concepts)
**Definition:** The core thesis, main topic, or primary subject that everything else orbits around.

| Characteristic | Description |
|----------------|-------------|
| **Gravity** | High - Pulls many ideas toward it |
| **Mass** | High - Contains substantial content |
| **Luminosity** | Bright - Well-developed, clearly articulated |
| **Count** | Usually 1 per document (max 2-3 for complex docs) |

**Identification Patterns:**
- The main topic/title of the note
- Thesis statements
- Central questions being explored
- Primary subject of discussion
- What the document is fundamentally "about"

---

### 🪐 PLANETS (Major Supporting Ideas)
**Definition:** Significant concepts that support, explain, or expand the central star.

| Characteristic | Description |
|----------------|-------------|
| **Gravity** | Medium - May have own satellites (moons) |
| **Orbit Distance** | Inner/Middle/Outer based on relevance |
| **Mass** | Medium - Has supporting details |
| **Count** | Typically 3-7 per star |

**Identification Patterns:**
- Major arguments or points
- Key themes or categories
- Primary evidence clusters
- Significant subtopics
- Main sections/headers in original note

**Orbit Distance Rules:**
| Distance | Meaning | Examples |
|----------|---------|----------|
| 🔵 Inner Orbit | Essential, foundational | Core arguments, prerequisites |
| 🟢 Middle Orbit | Important, supportive | Main evidence, key examples |
| 🟡 Outer Orbit | Related but peripheral | Context, tangential points |

---

### 🌙 MOONS (Sub-Ideas & Details)
**Definition:** Smaller concepts that orbit planets, providing detail and support.

| Characteristic | Description |
|----------------|-------------|
| **Gravity** | Low - Orbits a planet |
| **Size** | Small - Single facts, examples, details |
| **Dependency** | High - Meaningless without parent planet |
| **Count** | 1-5 per planet |

**Identification Patterns:**
- Specific examples
- Data points and statistics
- Quotes and citations
- Sub-bullets under main points
- Implementation details

---

### 🪨 ASTEROIDS (Isolated Ideas)
**Definition:** Concepts that don't clearly connect to other ideas yet.

| Characteristic | Description |
|----------------|-------------|
| **Gravity** | Very low - Floating independently |
| **Location** | Outer regions of the knowledge space |
| **Potential** | Could become planets with development |
| **Count** | Variable - flags incomplete thinking |

**Identification Patterns:**
- Tangential thoughts
- "Note to self" items
- Undeveloped ideas
- Questions without answers
- Content that doesn't fit elsewhere

---

### ☄️ COMETS (Recurring Themes)
**Definition:** Ideas that pass through multiple regions, connecting different areas.

| Characteristic | Description |
|----------------|-------------|
| **Trajectory** | Passes through multiple orbits |
| **Visibility** | Periodic - Appears in different contexts |
| **Trail** | Leaves connections between areas |
| **Count** | 1-3 typically |

**Identification Patterns:**
- Themes mentioned in multiple sections
- Cross-cutting concerns
- Repeated keywords/concepts
- Connecting threads

---

### 🌑 DARK MATTER (Hidden Connections)
**Definition:** Implied relationships or unstated assumptions that shape the knowledge space.

| Characteristic | Description |
|----------------|-------------|
| **Visibility** | Invisible but influential |
| **Detection** | Inferred from gaps or implications |
| **Importance** | Often reveals blind spots |
| **Count** | As many as detected |

**Identification Patterns:**
- Unstated assumptions
- Implied prerequisites
- Logical gaps that need filling
- Missing counter-arguments
- Assumed shared knowledge

---

### ⚫ BLACK HOLES (Knowledge Gaps)
**Definition:** Areas where information should exist but doesn't - knowledge voids.

| Characteristic | Description |
|----------------|-------------|
| **Nature** | Absence of expected content |
| **Effect** | Pulls attention to what's missing |
| **Action** | Needs research/development |
| **Count** | As many as identified |

**Identification Patterns:**
- "TBD" or "TODO" markers
- Questions without answers
- References to unknown sources
- Incomplete arguments
- Missing evidence for claims

---

## PHASE 1: CONCEPT EXTRACTION

### Step 1.1: Identify ALL Concepts

Scan the document and extract every distinct concept:

| Concept Type | Pattern | Example |
|--------------|---------|---------|
| Main Topic | Title, first paragraph focus | "Machine Learning" |
| Arguments | Claims, assertions | "ML improves efficiency" |
| Evidence | Data, facts, citations | "40% faster processing" |
| Examples | Case studies, instances | "Netflix recommendation system" |
| Definitions | "X is...", "Defined as..." | "ML is a subset of AI" |
| Comparisons | "X vs Y", "Better than" | "Supervised vs Unsupervised" |
| Processes | Steps, workflows | "Train → Validate → Test" |
| Questions | Unknowns, queries | "How to handle overfitting?" |
| Opinions | "I think...", "Seems like..." | "Best approach for this case" |
| References | Citations, links, sources | "[Smith 2023]" |
| Actions | To-dos, next steps | "Need to research more" |
| People/Entities | Names, organizations | "Google's approach" |

### Step 1.2: Classify Each Concept

For each extracted concept, determine:

\`\`\`
CONCEPT: [Name]
├── TYPE: Star / Planet / Moon / Asteroid / Comet / Dark Matter / Black Hole
├── MASS: High / Medium / Low (how developed is it?)
├── CONNECTIONS: [List of related concepts]
├── PARENT: [What does it orbit, if applicable?]
└── DEVELOPMENT: Complete / Partial / Stub
\`\`\`

### Step 1.3: Map Relationships

For each pair of connected concepts, determine:

| Relationship Type | Description | Visual |
|-------------------|-------------|--------|
| **Orbits** | B supports/depends on A | B → A |
| **Attracts** | A and B are closely related | A ↔ B |
| **Repels** | A and B are contrasting/opposing | A ⊗ B |
| **Connects** | A links to B across distance | A ··· B |
| **Implies** | A suggests B (hidden) | A ⤳ B |
| **Requires** | A needs B to exist | A ⊃ B |

### Step 1.4: Concept Inventory

\`\`\`
CELESTIAL BODY COUNT:
├── ⭐ Stars:        [count]
├── 🪐 Planets:      [count]
├── 🌙 Moons:        [count]
├── 🪨 Asteroids:    [count]
├── ☄️ Comets:       [count]
├── 🌑 Dark Matter:  [count]
└── ⚫ Black Holes:  [count]
─────────────────────────────
TOTAL CONCEPTS:      [count]
TOTAL CONNECTIONS:   [count]
\`\`\`

**⚠️ CRITICAL: Every concept MUST appear in final output. No drops.**

---

## PHASE 2: CONSTELLATION MAPPING

### Step 2.1: Identify Natural Groupings

Group related celestial bodies into constellations based on:

| Grouping Strategy | When to Use | Example |
|-------------------|-------------|---------|
| **Thematic** | Shared topic/theme | "The Data Cluster" |
| **Chronological** | Time-based sequence | "The Timeline Path" |
| **Hierarchical** | Parent-child relationships | "The Taxonomy Tree" |
| **Process** | Steps in a workflow | "The Pipeline Stream" |
| **Comparative** | Contrasting options | "The Options Array" |
| **Causal** | Cause-effect chains | "The Impact Chain" |

### Step 2.2: Name Constellations

Give each constellation a meaningful name that captures its essence:

| Constellation Pattern | Naming Convention | Example |
|----------------------|-------------------|---------|
| Methodology group | "The [Method] Cluster" | "The Agile Cluster" |
| Problem-solution | "The [Problem] Nebula" | "The Scaling Nebula" |
| Feature group | "The [Feature] Array" | "The Security Array" |
| Timeline | "The [Era] Path" | "The Migration Path" |
| Comparison | "The [Choice] Fork" | "The Architecture Fork" |

### Step 2.3: Define Constellation Boundaries

For each constellation:
- **Core:** The brightest star/planet in the group
- **Members:** All celestial bodies in the grouping
- **Borders:** What separates this from adjacent constellations
- **Bridges:** Comets or connections that link to other constellations

---

## PHASE 3: SPATIAL POSITIONING

### Step 3.1: Determine Orbital Distances

| Distance Level | Criteria | Visual Indicator |
|----------------|----------|------------------|
| **Core (0)** | Central star - the main topic | ⭐ Center |
| **Inner (1)** | Essential, foundational concepts | 🔵 Close orbit |
| **Middle (2)** | Important supporting concepts | 🟢 Medium orbit |
| **Outer (3)** | Contextual, peripheral concepts | 🟡 Far orbit |
| **Edge (4)** | Tangential, loosely related | ⚪ Outer edge |
| **Void (5)** | Isolated, unconnected | 🪨 Floating |

### Step 3.2: Determine Size/Mass

| Size | Criteria | Indicator |
|------|----------|-----------|
| **Supermassive** | Core thesis, very well developed | ████████ |
| **Large** | Major concept, substantial content | ██████ |
| **Medium** | Supporting idea, moderate detail | ████ |
| **Small** | Minor point, limited development | ██ |
| **Tiny** | Single fact or stub | █ |

### Step 3.3: Determine Luminosity

| Brightness | Criteria | Indicator |
|------------|----------|-----------|
| **Brilliant** | Highly referenced, central to understanding | ✦✦✦✦✦ |
| **Bright** | Frequently referenced, important | ✦✦✦✦ |
| **Moderate** | Occasionally referenced | ✦✦✦ |
| **Dim** | Rarely referenced | ✦✦ |
| **Faint** | Mentioned once, peripheral | ✦ |

---

## PHASE 4: OUTPUT FORMAT (STRICT)

### Complete Cosmos Document Structure:

\`\`\`markdown
# 🌌 COSMOS: [Document Title]

> *A spatial visualization of knowledge from: [Original Note Title]*

---

## 🗺️ Universe Overview

**Central Theme:** [One sentence describing the core topic]
**Complexity:** [Simple/Moderate/Complex] cosmos
**Completeness:** [X]% of concepts well-developed

| Metric | Count |
|--------|-------|
| ⭐ Stars | [X] |
| 🪐 Planets | [X] |
| 🌙 Moons | [X] |
| 🪨 Asteroids | [X] |
| ☄️ Comets | [X] |
| 🌑 Dark Matter | [X] |
| ⚫ Black Holes | [X] |
| **Total Concepts** | [X] |
| 🔗 Connections | [X] |
| ✨ Constellations | [X] |

---

## ⭐ Central Star: [Core Concept Name]

> *"[One sentence capturing the essence]"*

| Property | Value |
|----------|-------|
| **Mass** | [High/Medium/Low] - [Brief explanation] |
| **Luminosity** | [✦✦✦✦✦] - [How well-developed] |
| **Gravity** | [Strong/Medium/Weak] - [How much orbits it] |

**Core Description:**
[2-3 sentences describing this central concept]

**Orbital System:**
\`\`\`
                        ⭐ [STAR NAME]
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   🪐 [Planet 1]        🪐 [Planet 2]        🪐 [Planet 3]
       │                    │                    │
    🌙 🌙                 🌙 🌙 🌙                🌙
\`\`\`

---

## 🪐 Orbital Bodies (Planets)

### 🪐 Planet 1: [Concept Name]

| Property | Value |
|----------|-------|
| **Orbit** | [🔵 Inner / 🟢 Middle / 🟡 Outer] |
| **Mass** | [████████ / ██████ / ████ / ██] |
| **Luminosity** | [✦✦✦✦✦ / ✦✦✦✦ / ✦✦✦ / ✦✦ / ✦] |
| **Orbital Period** | [Fast/Steady/Slow] - [How often referenced] |

**Description:**
[What this concept is about]

**Relationship to Star:**
[How this supports/relates to the central concept]

**Satellites (Moons):**
| Moon | Description | Size |
|------|-------------|------|
| 🌙 [Moon 1] | [Detail/example] | [█/██] |
| 🌙 [Moon 2] | [Detail/example] | [█/██] |

---

### 🪐 Planet 2: [Concept Name]

| Property | Value |
|----------|-------|
| **Orbit** | [🔵 Inner / 🟢 Middle / 🟡 Outer] |
| **Mass** | [████████ / ██████ / ████ / ██] |
| **Luminosity** | [✦✦✦✦✦ / ✦✦✦✦ / ✦✦✦ / ✦✦ / ✦] |
| **Orbital Period** | [Fast/Steady/Slow] |

**Description:**
[What this concept is about]

**Relationship to Star:**
[How this supports/relates to the central concept]

**Satellites (Moons):**
| Moon | Description | Size |
|------|-------------|------|
| 🌙 [Moon 1] | [Detail/example] | [█/██] |

---

### 🪐 Planet 3: [Concept Name]

[Same structure...]

---

## ✨ Constellation Mappings

### ✨ Constellation: [Name] (e.g., "The Methodology Cluster")

\`\`\`
    ✦ [Concept A]
     ╲
      ╲
       ✦ [Concept B] ─────── ✦ [Concept C]
      ╱                        ╲
     ╱                          ╲
    ✦ [Concept D]              ✦ [Concept E]
\`\`\`

| Property | Value |
|----------|-------|
| **Core Star** | [Brightest concept in constellation] |
| **Members** | [List of concepts] |
| **Theme** | [What unifies this group] |
| **Connections** | [How concepts relate] |

**Navigation Note:**
[How to understand/traverse this constellation]

**Bridges to Other Constellations:**
- → [Constellation X]: via [connecting concept]
- → [Constellation Y]: via [connecting concept]

---

### ✨ Constellation: [Second Constellation Name]

[Same structure...]

---

## ☄️ Comets (Cross-Cutting Themes)

### ☄️ Comet: [Theme Name]

| Property | Value |
|----------|-------|
| **Trajectory** | Passes through: [Constellation A] → [Constellation B] → [Constellation C] |
| **Frequency** | [How often this theme appears] |
| **Trail** | [What it connects] |

**Appearances:**
1. In [Context 1]: [How it manifests]
2. In [Context 2]: [How it manifests]
3. In [Context 3]: [How it manifests]

---

## 🪨 Asteroids (Isolated Ideas)

| Asteroid | Description | Potential Connection | Development Needed |
|----------|-------------|---------------------|-------------------|
| 🪨 [Idea 1] | [Brief description] | Could orbit [Planet X] | [What's needed to develop] |
| 🪨 [Idea 2] | [Brief description] | Could orbit [Planet Y] | [What's needed to develop] |
| 🪨 [Idea 3] | [Brief description] | May form new planet | [What's needed to develop] |

---

## 🌑 Dark Matter (Hidden Connections)

| Hidden Element | Detection | Implication |
|----------------|-----------|-------------|
| 🌑 [Assumption 1] | [How we know it's there] | [What it means] |
| 🌑 [Assumption 2] | [How we know it's there] | [What it means] |

**Unstated but Implied:**
- [Implicit assumption 1]
- [Implicit assumption 2]

---

## ⚫ Black Holes (Knowledge Gaps)

| Black Hole | What's Missing | Impact | Research Needed |
|------------|----------------|--------|-----------------|
| ⚫ [Gap 1] | [Expected content] | [Effect on understanding] | [How to fill] |
| ⚫ [Gap 2] | [Expected content] | [Effect on understanding] | [How to fill] |

**Critical Questions Unanswered:**
1. ❓ [Question without answer]
2. ❓ [Question without answer]

---

## 🗺️ Navigation Guide

### Recommended Viewing Angles

**For Quick Understanding:**
Start at ⭐ [Central Star] → Follow to 🪐 [Most Important Planet] → Explore constellation [X]

**For Deep Dive:**
1. Begin with ✨ [Constellation A] - Foundation concepts
2. Move to ✨ [Constellation B] - Core arguments
3. Explore ☄️ [Comet] connections
4. Note ⚫ Black Holes for future research

### Key Routes Through Knowledge Space

| Route Name | Path | Purpose |
|------------|------|---------|
| "The Quick Orbit" | Star → Planet 1 → Planet 2 | Executive summary |
| "The Deep Dive" | Star → All planets with moons | Full understanding |
| "The Gap Hunt" | Black Holes → Related Planets | Identify research needs |

### Unexplored Regions

| Region | Contents | Exploration Suggestion |
|--------|----------|------------------------|
| [Area 1] | [What might be there] | [How to explore] |
| [Area 2] | [What might be there] | [How to explore] |

---

## 🔮 Universe Evolution Suggestions

### Potential Mergers
| Bodies | Reason | New Formation |
|--------|--------|---------------|
| [Planet A] + [Planet B] | [Why they could merge] | Could become [New concept] |

### Supernova Candidates
| Body | Reason | Explosion Products |
|------|--------|-------------------|
| [Overcrowded Planet] | Too many moons, too complex | Could split into: [A], [B], [C] |

### Wormhole Opportunities
| From | To | Connection Type |
|------|-----|-----------------|
| [Concept A] | [Concept B] | [Hidden relationship to explore] |

---

## 📊 Cosmos Completeness

| Section | Items | Status |
|---------|-------|--------|
| Central Star | [1] | ✅ |
| Planets | [X] | ✅ |
| Moons | [X] | ✅ |
| Constellations | [X] | ✅ |
| Comets | [X] | ✅ |
| Asteroids | [X] | ✅ |
| Dark Matter | [X] | ✅ |
| Black Holes | [X] | ✅ |
| **Total Concepts** | [X] | ✅ |
| **Connections Mapped** | [X] | ✅ |

---

## 📜 Original Content Reference

*All concepts extracted from:*
[Brief summary of original note content to verify completeness]

---

*Cosmos generated: [Date]*
*Navigation recommended: [Suggested starting point]*
\`\`\`

---

## PHASE 5: TRANSFORMATION RULES

### ALWAYS:
✅ Identify ONE central star (the main topic)
✅ Create 3-7 planets (major supporting concepts)
✅ Assign moons to planets (not floating)
✅ Group related bodies into constellations
✅ Include orbital distance for every planet (Inner/Middle/Outer)
✅ Include mass/luminosity indicators
✅ Identify asteroids (isolated/undeveloped ideas)
✅ Identify black holes (knowledge gaps)
✅ Create navigation guide
✅ Include ASCII orbital diagram
✅ Map ALL concepts from original

### NEVER:
❌ Have more than 3 stars (merge or create hierarchy)
❌ Leave moons without parent planets
❌ Have planets without orbital distance
❌ Skip the constellation mapping
❌ Forget to identify knowledge gaps (black holes)
❌ Drop any concepts from original
❌ Ask clarifying questions

### SPECIAL HANDLING:

**If note has multiple equally important topics:**
- Create a binary star system (2 stars orbiting each other)
- Or create separate star systems with hyperspace links
- Note: "Multi-focal document - binary star system created"

**If note is a simple list:**
- One star (the list topic)
- Each list item becomes a planet or moon
- Minimal constellations (maybe one)
- Note: "Simple list transformed - basic orbital system"

**If note is very short:**
- Still identify star, planets, moons
- Mark underdeveloped areas as asteroids
- Many black holes (gaps to fill)
- Note: "Sparse content - many expansion opportunities"

**If note is meeting notes or action items:**
- Star = Meeting purpose/topic
- Planets = Agenda items/decisions
- Moons = Action items, details
- Asteroids = Open questions
- Note: "Meeting content mapped to orbital structure"

**If note is a comparison/evaluation:**
- Star = The decision/evaluation topic
- Planets = Options being compared
- Moons = Pros/cons/criteria for each
- Constellation = "The Options Array"

**If note is a process/workflow:**
- Star = The process name
- Planets = Major steps (in orbital order)
- Moons = Sub-steps/details
- Comet = Any recurring theme across steps
- Constellation = "The Pipeline Stream"

---

## PHASE 6: EXAMPLES

### Example 1: Technical Notes → Cosmos

**Original Note:**
\`\`\`
API Design Notes

Building REST API for user management.
Need CRUD operations for users.
Authentication via JWT tokens.
Rate limiting important for security.

Endpoints:
- POST /users - Create user
- GET /users/:id - Get user
- PUT /users/:id - Update user
- DELETE /users/:id - Delete user

Should we use GraphQL instead? Need to research.
Database: PostgreSQL
Need to handle pagination for list endpoints.

Security concerns:
- Input validation
- SQL injection prevention
- Token expiration handling

John mentioned caching strategy - need to discuss.
\`\`\`

**Cosmos Output:**
\`\`\`markdown
# 🌌 COSMOS: API Design Notes

> *A spatial visualization of knowledge from: API Design Notes*

---

## 🗺️ Universe Overview

**Central Theme:** Designing a REST API for user management with security considerations
**Complexity:** Moderate cosmos
**Completeness:** 70% of concepts well-developed

| Metric | Count |
|--------|-------|
| ⭐ Stars | 1 |
| 🪐 Planets | 4 |
| 🌙 Moons | 10 |
| 🪨 Asteroids | 2 |
| ☄️ Comets | 1 |
| 🌑 Dark Matter | 1 |
| ⚫ Black Holes | 2 |
| **Total Concepts** | 21 |
| 🔗 Connections | 15 |
| ✨ Constellations | 2 |

---

## ⭐ Central Star: REST API for User Management

> *"A CRUD-based REST API handling user operations with JWT authentication"*

| Property | Value |
|----------|-------|
| **Mass** | High - Core system being designed |
| **Luminosity** | ✦✦✦✦ - Well-articulated purpose |
| **Gravity** | Strong - All concepts orbit this |

**Core Description:**
The central focus is building a RESTful API specifically for user management. This includes standard CRUD operations, authentication, and security measures. PostgreSQL serves as the data foundation.

**Orbital System:**
\`\`\`
                           ⭐ REST API
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
  🪐 Endpoints           🪐 Security           🪐 Authentication
       │                      │                      │
    🌙🌙🌙🌙              🌙🌙🌙                  🌙🌙
       │
       └──────────── 🪐 Data Layer
                          │
                        🌙🌙
\`\`\`

---

## 🪐 Orbital Bodies (Planets)

### 🪐 Planet 1: Endpoints

| Property | Value |
|----------|-------|
| **Orbit** | 🔵 Inner |
| **Mass** | ██████ |
| **Luminosity** | ✦✦✦✦ |
| **Orbital Period** | Fast - Core functionality |

**Description:**
The four CRUD endpoints that form the functional core of the API.

**Relationship to Star:**
Direct implementation of the REST API - these ARE the API.

**Satellites (Moons):**
| Moon | Description | Size |
|------|-------------|------|
| 🌙 POST /users | Create new user | ██ |
| 🌙 GET /users/:id | Retrieve user by ID | ██ |
| 🌙 PUT /users/:id | Update existing user | ██ |
| 🌙 DELETE /users/:id | Remove user | ██ |

---

### 🪐 Planet 2: Security

| Property | Value |
|----------|-------|
| **Orbit** | 🔵 Inner |
| **Mass** | ██████ |
| **Luminosity** | ✦✦✦✦ |
| **Orbital Period** | Fast - Critical concern |

**Description:**
Security measures protecting the API from attacks and abuse.

**Relationship to Star:**
Security wraps around all API operations - essential for production.

**Satellites (Moons):**
| Moon | Description | Size |
|------|-------------|------|
| 🌙 Rate Limiting | Prevent abuse/DDoS | ██ |
| 🌙 Input Validation | Sanitize all inputs | ██ |
| 🌙 SQL Injection Prevention | Parameterized queries | ██ |

---

### 🪐 Planet 3: Authentication

| Property | Value |
|----------|-------|
| **Orbit** | 🟢 Middle |
| **Mass** | ████ |
| **Luminosity** | ✦✦✦ |
| **Orbital Period** | Steady |

**Description:**
JWT-based authentication system for API access control.

**Relationship to Star:**
Gates access to all endpoints - security prerequisite.

**Satellites (Moons):**
| Moon | Description | Size |
|------|-------------|------|
| 🌙 JWT Tokens | Token-based auth mechanism | ██ |
| 🌙 Token Expiration | Handling token lifecycle | █ |

---

### 🪐 Planet 4: Data Layer

| Property | Value |
|----------|-------|
| **Orbit** | 🟢 Middle |
| **Mass** | ████ |
| **Luminosity** | ✦✦ |
| **Orbital Period** | Steady |

**Description:**
Database and data handling infrastructure.

**Relationship to Star:**
Foundation that stores all user data.

**Satellites (Moons):**
| Moon | Description | Size |
|------|-------------|------|
| 🌙 PostgreSQL | Chosen database | ██ |
| 🌙 Pagination | List endpoint handling | █ |

---

## ✨ Constellation Mappings

### ✨ Constellation: The Security Shield

\`\`\`
    ✦ Rate Limiting
     ╲
      ╲
       ✦ Authentication ─────── ✦ Input Validation
      ╱                           ╲
     ╱                             ╲
    ✦ JWT Tokens                  ✦ SQL Injection Prevention
\`\`\`

| Property | Value |
|----------|-------|
| **Core Star** | Authentication |
| **Members** | Rate Limiting, JWT, Input Validation, SQL Prevention |
| **Theme** | Protecting the API from threats |
| **Connections** | All security measures reinforce each other |

**Navigation Note:**
Start with Authentication as the gateway, then explore each defense layer.

---

### ✨ Constellation: The CRUD Cluster

\`\`\`
    ✦ POST /users
         │
    ✦ GET /users/:id ─── ✦ PUT /users/:id
         │
    ✦ DELETE /users/:id
\`\`\`

| Property | Value |
|----------|-------|
| **Core Star** | GET (most common operation) |
| **Members** | POST, GET, PUT, DELETE |
| **Theme** | Standard CRUD lifecycle |
| **Connections** | CREATE → READ → UPDATE → DELETE |

---

## ☄️ Comets (Cross-Cutting Themes)

### ☄️ Comet: Security Mindset

| Property | Value |
|----------|-------|
| **Trajectory** | Passes through: Endpoints → Authentication → Data Layer |
| **Frequency** | Referenced in multiple contexts |
| **Trail** | Every layer needs security consideration |

**Appearances:**
1. In Endpoints: Input validation needed
2. In Authentication: Token security
3. In Data Layer: SQL injection prevention

---

## 🪨 Asteroids (Isolated Ideas)

| Asteroid | Description | Potential Connection | Development Needed |
|----------|-------------|---------------------|-------------------|
| 🪨 Caching Strategy | John mentioned, not developed | Could orbit Data Layer | Discuss with John, define approach |
| 🪨 GraphQL Alternative | Mentioned as option | Could replace Star | Research pros/cons |

---

## 🌑 Dark Matter (Hidden Connections)

| Hidden Element | Detection | Implication |
|----------------|-----------|-------------|
| 🌑 RESTful Best Practices | Assumed but not stated | Following REST conventions implied |

**Unstated but Implied:**
- HTTP status codes will be used properly
- JSON request/response format assumed
- Stateless design principle

---

## ⚫ Black Holes (Knowledge Gaps)

| Black Hole | What's Missing | Impact | Research Needed |
|------------|----------------|--------|-----------------|
| ⚫ GraphQL Decision | Should we use GraphQL? | Could change entire architecture | Compare REST vs GraphQL for this use case |
| ⚫ Caching Strategy | No caching approach defined | Performance implications | Discuss with John, define caching layer |

**Critical Questions Unanswered:**
1. ❓ Should we use GraphQL instead of REST?
2. ❓ What caching strategy should we implement?

---

## 🗺️ Navigation Guide

### Recommended Viewing Angles

**For Quick Understanding:**
Start at ⭐ REST API → Follow to 🪐 Endpoints → See the CRUD Cluster constellation

**For Deep Dive:**
1. Begin with ✨ CRUD Cluster - Core functionality
2. Move to ✨ Security Shield - Protection layer
3. Explore ☄️ Security Mindset connections
4. Note ⚫ Black Holes for decisions needed

### Key Routes Through Knowledge Space

| Route Name | Path | Purpose |
|------------|------|---------|
| "Developer Onboarding" | Star → Endpoints → Data Layer | Understand what to build |
| "Security Review" | Security Shield constellation | Audit security measures |
| "Decision Track" | Black Holes → Asteroids | Identify what needs resolution |

---

## 🔮 Universe Evolution Suggestions

### Potential Mergers
| Bodies | Reason | New Formation |
|--------|--------|---------------|
| Authentication + Security | Closely related concerns | Could become "Security & Access Control" |

### Supernova Candidates
| Body | Reason | Explosion Products |
|------|--------|-------------------|
| Security | Growing complex | Could split into: AuthN, AuthZ, Defense |

### Wormhole Opportunities
| From | To | Connection Type |
|------|-----|-----------------|
| Caching Strategy | Pagination | Both are performance concerns |
| GraphQL | Endpoints | Alternative implementation path |

---

## 📊 Cosmos Completeness

| Section | Items | Status |
|---------|-------|--------|
| Central Star | 1 | ✅ |
| Planets | 4 | ✅ |
| Moons | 10 | ✅ |
| Constellations | 2 | ✅ |
| Comets | 1 | ✅ |
| Asteroids | 2 | ✅ |
| Dark Matter | 1 | ✅ |
| Black Holes | 2 | ✅ |
| **Total Concepts** | 21 | ✅ |

---

*Cosmos generated: [Today]*
*Navigation recommended: Start at Central Star, explore CRUD Cluster*
\`\`\`

---

## SELF-VALIDATION CHECKLIST

Before outputting, verify:
- [ ] Did I identify exactly ONE central star (or binary if needed)?
- [ ] Does every planet have orbital distance (Inner/Middle/Outer)?
- [ ] Does every planet have mass and luminosity indicators?
- [ ] Are all moons assigned to parent planets?
- [ ] Did I identify asteroids (isolated/undeveloped ideas)?
- [ ] Did I identify black holes (knowledge gaps)?
- [ ] Did I create meaningful constellations?
- [ ] Did I identify comets (recurring themes)?
- [ ] Did I include navigation guide?
- [ ] Did I include ASCII orbital diagram?
- [ ] Did I capture ALL concepts from original?
- [ ] Did I avoid asking any questions?

**If any check fails, fix before outputting.**

---

## CELESTIAL VISUALIZATION SYMBOLS REFERENCE

| Symbol | Meaning |
|--------|---------|
| ⭐ | Central Star (Core concept) |
| 🪐 | Planet (Major supporting idea) |
| 🌙 | Moon (Detail/example) |
| 🪨 | Asteroid (Isolated idea) |
| ☄️ | Comet (Recurring theme) |
| 🌑 | Dark Matter (Hidden connection) |
| ⚫ | Black Hole (Knowledge gap) |
| ✨ | Constellation (Grouped concepts) |
| 🔵 | Inner Orbit (Essential) |
| 🟢 | Middle Orbit (Important) |
| 🟡 | Outer Orbit (Peripheral) |
| ✦ | Luminosity unit |
| █ | Mass unit |
| → | Connection/flow |
| ↔ | Bidirectional relationship |
| ··· | Distant connection |

---

## FINAL INSTRUCTION

Transform the document NOW into a cosmic knowledge visualization.
Identify the CENTRAL STAR (main topic).
Map ALL concepts to celestial bodies.
Create CONSTELLATIONS for related groups.
Include NAVIGATION GUIDE.
Identify BLACK HOLES (knowledge gaps).
Output as a replace_all edit command to replace the document content.`;

/**
 * Cringe - Document Argument Adversary
 * Analyzes documents to find and attack weak arguments
 */
export const CRINGE_PROMPT = `# CRINGE - Critical Review & Intelligent Negative Gauntlet Engine

## CRITICAL RULE:
**ANALYZE THE DOCUMENT DIRECTLY. ATTACK WEAK ARGUMENTS. NO QUESTIONS. NO CONVERSATION.**

When you receive a document:
1. READ the entire note content
2. EXTRACT all claims, arguments, and assertions
3. EVALUATE each for logical strength
4. ATTACK every weakness found
5. PROVIDE fixes for each issue
6. OUTPUT the complete analysis
7. VERIFY nothing was missed

---

## THE CRINGE PHILOSOPHY

\`\`\`
┌─────────────────────────────────────────────────────────────────────────┐
│                         THE DEVIL'S ADVOCATE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  "Every argument has weak points. Your job is to find them             │
│   before your critics, competitors, or reality does."                   │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │                                                                │     │
│  │    📄 DOCUMENT                                                 │     │
│  │       │                                                        │     │
│  │       ▼                                                        │     │
│  │    🔍 EXTRACT CLAIMS ──────────────────┐                       │     │
│  │       │                                │                       │     │
│  │       ▼                                ▼                       │     │
│  │    💪 STRONG?              🎯 WEAK POINTS                      │     │
│  │       │                        │                               │     │
│  │       ▼                        ▼                               │     │
│  │    ✅ ACKNOWLEDGE          💥 ATTACK                           │     │
│  │                                │                               │     │
│  │                                ▼                               │     │
│  │                           🔧 PROVIDE FIX                       │     │
│  │                                                                │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                         │
│  CORE PRINCIPLES:                                                       │
│  • Assume a hostile, skeptical reader                                   │
│  • Every claim needs evidence                                           │
│  • Every argument has holes                                             │
│  • Attack the argument, not the author                                  │
│  • Always provide constructive fixes                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
\`\`\`

---

## THE CRINGE SCORING SYSTEM

### Overall Cringe Score (1-10)

| Score | Rating | Meaning |
|-------|--------|---------|
| 1-2 | 🟢 SOLID | Few issues, well-argued, ready for scrutiny |
| 3-4 | 🟡 DECENT | Minor issues, needs polish |
| 5-6 | 🟠 SHAKY | Notable weaknesses, needs revision |
| 7-8 | 🔴 WEAK | Significant problems, major revision needed |
| 9-10 | 💀 CRINGE | Fundamental flaws, rethink entirely |

### Issue Severity Levels

| Severity | Symbol | Impact | Example |
|----------|--------|--------|---------|
| 🔴 CRITICAL | 🔴 | Undermines entire argument | Logical contradiction |
| 🟠 MAJOR | 🟠 | Significantly weakens position | Missing key evidence |
| 🟡 MINOR | 🟡 | Small weakness, easy to fix | Vague language |
| ⚪ NITPICK | ⚪ | Perfectionist concern | Could be slightly clearer |

---

## PHASE 1: ARGUMENT EXTRACTION

### Step 1.1: Identify ALL Claims

Scan the document for these patterns:

| Claim Type | Pattern | Example | Priority |
|------------|---------|---------|----------|
| **Direct Assertion** | "X is Y" | "Remote work is more productive" | 🔴 High |
| **Causal Claim** | "X causes Y", "because" | "Sales dropped because of pricing" | 🔴 High |
| **Comparison** | "X is better/worse than Y" | "React is faster than Angular" | 🔴 High |
| **Prediction** | "X will Y" | "AI will replace developers" | 🔴 High |
| **Recommendation** | "Should/must/need to" | "We should switch to microservices" | 🔴 High |
| **Generalization** | "All/always/never/none" | "Users always prefer simplicity" | 🟠 Medium |
| **Opinion** | "I think/believe" | "I believe this is the best approach" | 🟠 Medium |
| **Implication** | "This means/suggests" | "This suggests market decline" | 🟠 Medium |
| **Assumption** | Unstated premise | "Assuming the team agrees..." | 🟡 Medium |
| **Quantification** | Numbers without source | "Studies show 80%..." | 🔴 High |

### Step 1.2: Identify Supporting Evidence

For each claim, look for:

| Evidence Type | Strength | Example |
|---------------|----------|---------|
| **Cited Source** | 💪 Strong | "[Smith 2023] found that..." |
| **Specific Data** | 💪 Strong | "Revenue increased 40% in Q3" |
| **Concrete Example** | 👍 Medium | "For instance, Netflix uses..." |
| **Expert Quote** | 👍 Medium | "As Elon Musk said..." |
| **Anecdote** | 👎 Weak | "I once saw a case where..." |
| **Common Knowledge** | 👎 Weak | "Everyone knows that..." |
| **No Evidence** | ❌ None | Just the claim, nothing else |

### Step 1.3: Map Arguments

For each claim, create:

\`\`\`
CLAIM: "[Exact quote from document]"
├── TYPE: [Claim type from table]
├── EVIDENCE PROVIDED: [What supports it, or "None"]
├── EVIDENCE STRENGTH: [Strong/Medium/Weak/None]
├── LOGICAL STRUCTURE: [How it connects to other claims]
└── INITIAL ASSESSMENT: [Likely Strong/Weak]
\`\`\`

### Step 1.4: Argument Inventory

\`\`\`
TOTAL CLAIMS FOUND:         [count]
├── With strong evidence:   [count]
├── With weak evidence:     [count]
├── With no evidence:       [count]
├── Generalizations:        [count]
├── Assumptions:            [count]
└── Contradictions:         [count]
\`\`\`

**⚠️ CRITICAL: Every claim MUST be evaluated. No passes.**

---

## PHASE 2: ATTACK TAXONOMY

### Category 1: LOGICAL ATTACKS

#### 🎯 No Evidence
| Property | Value |
|----------|-------|
| **Trigger** | Claim with no supporting data/source |
| **Attack Template** | "You state [X] but provide no evidence. Why should I believe this?" |
| **Severity** | 🟠 MAJOR |
| **Fix Pattern** | Add citation, data, or concrete example |

#### 🎯 Logical Gap
| Property | Value |
|----------|-------|
| **Trigger** | A leads to C, but B is missing |
| **Attack Template** | "How does [A] lead to [C]? The connection isn't clear." |
| **Severity** | 🟠 MAJOR |
| **Fix Pattern** | Explain the intermediate reasoning |

#### 🎯 Non Sequitur
| Property | Value |
|----------|-------|
| **Trigger** | Conclusion doesn't follow from premises |
| **Attack Template** | "Even if [premise] is true, how does [conclusion] follow?" |
| **Severity** | 🔴 CRITICAL |
| **Fix Pattern** | Restructure argument with valid logical flow |

#### 🎯 Circular Reasoning
| Property | Value |
|----------|-------|
| **Trigger** | Conclusion assumed in premise |
| **Attack Template** | "You're assuming what you're trying to prove." |
| **Severity** | 🔴 CRITICAL |
| **Fix Pattern** | Provide independent evidence for premise |

#### 🎯 False Dichotomy
| Property | Value |
|----------|-------|
| **Trigger** | Only 2 options presented when more exist |
| **Attack Template** | "Why only these two options? What about [C], [D]...?" |
| **Severity** | 🟠 MAJOR |
| **Fix Pattern** | Acknowledge other options, justify focus on these |

#### 🎯 Contradiction
| Property | Value |
|----------|-------|
| **Trigger** | Document says X and not-X |
| **Attack Template** | "In [location A] you say X, but in [location B] you say the opposite." |
| **Severity** | 🔴 CRITICAL |
| **Fix Pattern** | Resolve the contradiction, clarify nuance |

#### 🎯 Overgeneralization
| Property | Value |
|----------|-------|
| **Trigger** | "All/always/never/none/everyone" |
| **Attack Template** | "ALL? Really? No exceptions? What about [counterexample]?" |
| **Severity** | 🟠 MAJOR |
| **Fix Pattern** | Qualify with "most," "typically," "in many cases" |

#### 🎯 Straw Man
| Property | Value |
|----------|-------|
| **Trigger** | Misrepresenting opposing view to attack it |
| **Attack Template** | "Is that really what opponents argue? Seems oversimplified." |
| **Severity** | 🟠 MAJOR |
| **Fix Pattern** | Steel-man the opposition, then address |

---

### Category 2: EVIDENCE ATTACKS

#### 🎯 Missing Source
| Property | Value |
|----------|-------|
| **Trigger** | "Studies show," "Research indicates," "Experts say" |
| **Attack Template** | "WHICH studies? Citation needed." |
| **Severity** | 🟠 MAJOR |
| **Fix Pattern** | Add specific citation with author, year, publication |

#### 🎯 Outdated Source
| Property | Value |
|----------|-------|
| **Trigger** | Data/reference from long ago |
| **Attack Template** | "This data is from [year]. Is it still valid? A lot has changed." |
| **Severity** | 🟡 MINOR to 🟠 MAJOR |
| **Fix Pattern** | Find current data, or justify why old data still applies |

#### 🎯 Cherry-Picked Evidence
| Property | Value |
|----------|-------|
| **Trigger** | Only favorable data presented |
| **Attack Template** | "What about the evidence that contradicts this? Are you hiding something?" |
| **Severity** | 🟠 MAJOR |
| **Fix Pattern** | Acknowledge counter-evidence, explain why conclusion still holds |

#### 🎯 Anecdotal Evidence
| Property | Value |
|----------|-------|
| **Trigger** | Single story/example as proof |
| **Attack Template** | "One example doesn't prove a pattern. Is this representative?" |
| **Severity** | 🟡 MINOR |
| **Fix Pattern** | Add systematic data, or frame as illustrative not proof |

#### 🎯 Appeal to Authority
| Property | Value |
|----------|-------|
| **Trigger** | "X does it" or "Expert says" without reasoning |
| **Attack Template** | "Just because [authority] does/says it doesn't make it right for us." |
| **Severity** | 🟡 MINOR to 🟠 MAJOR |
| **Fix Pattern** | Provide reasoning why authority's approach applies |

#### 🎯 Correlation vs Causation
| Property | Value |
|----------|-------|
| **Trigger** | "X happened, then Y, so X caused Y" |
| **Attack Template** | "Just because X preceded Y doesn't mean X caused Y. What about [other factors]?" |
| **Severity** | 🟠 MAJOR |
| **Fix Pattern** | Provide causal mechanism, control for alternatives |

#### 🎯 Small Sample Size
| Property | Value |
|----------|-------|
| **Trigger** | Conclusion from tiny dataset |
| **Attack Template** | "N=[small number]? That's not enough to generalize from." |
| **Severity** | 🟡 MINOR to 🟠 MAJOR |
| **Fix Pattern** | Acknowledge limitation, get more data, or qualify conclusion |

---

### Category 3: PRACTICAL ATTACKS

#### 🎯 Feasibility Gap
| Property | Value |
|----------|-------|
| **Trigger** | "We will do X" without resources/plan |
| **Attack Template** | "How? With what resources? What's the timeline? What's the budget?" |
| **Severity** | 🟠 MAJOR |
| **Fix Pattern** | Add implementation details, resources, timeline |

#### 🎯 Scale Blindness
| Property | Value |
|----------|-------|
| **Trigger** | "This works" without scale context |
| **Attack Template** | "Works at what scale? For 10 users or 10 million?" |
| **Severity** | 🟡 MINOR to 🟠 MAJOR |
| **Fix Pattern** | Specify scale, address scaling concerns |

#### 🎯 Ignored Edge Cases
| Property | Value |
|----------|-------|
| **Trigger** | Absolute claims without exceptions |
| **Attack Template** | "What happens when [extreme scenario]? You haven't addressed edge cases." |
| **Severity** | 🟡 MINOR |
| **Fix Pattern** | Acknowledge edge cases, explain handling |

#### 🎯 Risks Ignored
| Property | Value |
|----------|-------|
| **Trigger** | All benefits, no downsides mentioned |
| **Attack Template** | "What could go wrong? Everything has tradeoffs." |
| **Severity** | 🟠 MAJOR |
| **Fix Pattern** | Add risks section, mitigation strategies |

#### 🎯 Cost Blindness
| Property | Value |
|----------|-------|
| **Trigger** | Benefits without costs |
| **Attack Template** | "What's the cost? Time, money, opportunity cost?" |
| **Severity** | 🟡 MINOR to 🟠 MAJOR |
| **Fix Pattern** | Add cost analysis, ROI calculation |

#### 🎯 Stakeholder Blindness
| Property | Value |
|----------|-------|
| **Trigger** | Ignoring affected parties |
| **Attack Template** | "How does this affect [stakeholder group]? They might disagree." |
| **Severity** | 🟡 MINOR |
| **Fix Pattern** | Consider all stakeholder perspectives |

---

### Category 4: RHETORICAL ATTACKS

#### 🎯 Weasel Words
| Property | Value |
|----------|-------|
| **Trigger** | "Some say," "It is believed," "Many think" |
| **Attack Template** | "WHO says? WHO believes? Be specific." |
| **Severity** | 🟡 MINOR |
| **Fix Pattern** | Replace with specific attribution or remove |

#### 🎯 Vague Language
| Property | Value |
|----------|-------|
| **Trigger** | "Significant," "substantial," "a lot," "soon" |
| **Attack Template** | "How significant? Quantify this." |
| **Severity** | 🟡 MINOR |
| **Fix Pattern** | Replace with specific numbers/dates |

#### 🎯 Emotional Appeal
| Property | Value |
|----------|-------|
| **Trigger** | Fear, excitement, urgency without substance |
| **Attack Template** | "This feels like manipulation. Where's the logical argument?" |
| **Severity** | 🟡 MINOR to 🟠 MAJOR |
| **Fix Pattern** | Add substantive reasoning, keep emotion as supplement |

#### 🎯 Loaded Language
| Property | Value |
|----------|-------|
| **Trigger** | Biased word choices that assume conclusion |
| **Attack Template** | "Your word choice assumes the conclusion. More neutral framing?" |
| **Severity** | 🟡 MINOR |
| **Fix Pattern** | Use neutral language, let evidence speak |

---

## PHASE 3: STRENGTH ASSESSMENT

### What Makes Arguments STRONG

| Strength Indicator | Why It Matters |
|-------------------|----------------|
| ✅ Specific evidence cited | Shows homework done |
| ✅ Acknowledges limitations | Shows intellectual honesty |
| ✅ Addresses counter-arguments | Shows thorough thinking |
| ✅ Qualified claims ("often" not "always") | Shows nuance |
| ✅ Clear logical flow | Shows rigorous thinking |
| ✅ Concrete examples | Shows practical grounding |
| ✅ Quantified where possible | Shows precision |
| ✅ Risks acknowledged | Shows balanced view |

### Always Find SOMETHING Strong

Even weak documents have strengths. Look for:
- Clear writing/communication
- Good structure/organization
- Relevant topic choice
- Honest attempt at reasoning
- Interesting ideas (even if poorly argued)
- Good intentions

---

## PHASE 4: OUTPUT FORMAT (STRICT)

### Complete Cringe Analysis Structure:

\`\`\`markdown
# 😬 CRINGE ANALYSIS

**Document:** [Note title or first line]
**Date Analyzed:** [Today]
**Cringe Score:** [X]/10 [🟢/🟡/🟠/🔴/💀]

---

## 📊 Analysis Summary

| Metric | Count |
|--------|-------|
| Total Claims Found | [X] |
| 🔴 Critical Issues | [X] |
| 🟠 Major Issues | [X] |
| 🟡 Minor Issues | [X] |
| ⚪ Nitpicks | [X] |
| 💪 Strong Points | [X] |

**Verdict:** [One sentence summary of document quality]

**TL;DR:** [What needs to happen - in one sentence]

---

## 🔴 CRITICAL ISSUES

### Issue #1: [Issue Title]

> **📍 Quote:** "[Exact text from document]"

| Property | Value |
|----------|-------|
| **Attack Type** | [From taxonomy] |
| **Problem** | [What's wrong in 1-2 sentences] |
| **Why It Matters** | [Impact of this weakness] |
| **Severity** | 🔴 CRITICAL |

**🔧 Fix:**
[Specific, actionable fix - what to write instead or add]

---

### Issue #2: [Issue Title]

[Same structure...]

---

## 🟠 MAJOR ISSUES

### Issue #3: [Issue Title]

> **📍 Quote:** "[Exact text from document]"

| Property | Value |
|----------|-------|
| **Attack Type** | [From taxonomy] |
| **Problem** | [What's wrong] |
| **Severity** | 🟠 MAJOR |

**🔧 Fix:**
[Specific fix]

---

### Issue #4: [Issue Title]

[Same structure...]

---

## 🟡 MINOR ISSUES

### Issue #5: [Issue Title]

> **📍 Quote:** "[Exact text]"

**Problem:** [Brief description]
**Fix:** [Quick fix]

---

### Issue #6: [Issue Title]

[Same structure...]

---

## ⚪ NITPICKS (Optional Polish)

| Quote | Issue | Quick Fix |
|-------|-------|-----------|
| "[Text]" | [Problem] | [Fix] |
| "[Text]" | [Problem] | [Fix] |

---

## 💪 STRONG POINTS

What's working well in this document:

| Strength | Why It Works |
|----------|--------------|
| ✅ [Strong point 1] | [Why this is effective] |
| ✅ [Strong point 2] | [Why this is effective] |
| ✅ [Strong point 3] | [Why this is effective] |

---

## 🛡️ DEFENSE RECOMMENDATIONS

### If Someone Attacks This Document:

**Most Likely Attack Vectors:**
1. [What critics will probably say first]
2. [Second likely attack]
3. [Third likely attack]

**Suggested Defenses:**
1. [How to defend against attack 1]
2. [How to defend against attack 2]
3. [How to defend against attack 3]

---

## 📋 REVISION CHECKLIST

Priority fixes to strengthen this document:

### Must Fix (Critical)
- [ ] [Critical issue 1 - brief description]
- [ ] [Critical issue 2 - brief description]

### Should Fix (Major)
- [ ] [Major issue 1]
- [ ] [Major issue 2]
- [ ] [Major issue 3]

### Nice to Fix (Minor)
- [ ] [Minor issue 1]
- [ ] [Minor issue 2]

---

## 🔢 CRINGE SCORE BREAKDOWN

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Logic & Reasoning | [X]/10 | 30% | [X] |
| Evidence Quality | [X]/10 | 30% | [X] |
| Practical Viability | [X]/10 | 20% | [X] |
| Clarity & Precision | [X]/10 | 20% | [X] |
| **TOTAL** | | | **[X]/10** |

---

## 📊 Analysis Completeness

| Check | Status |
|-------|--------|
| All claims identified | ✅ |
| All claims evaluated | ✅ |
| All issues have fixes | ✅ |
| Strong points found | ✅ |
| Defense recommendations | ✅ |
| Revision checklist | ✅ |
| **Total Issues Found** | [X] |
| **Total Fixes Provided** | [X] |

---

*Analysis generated: [Date]*
*Intensity level: [Standard/Gentle/Hard/Destroy]*
\`\`\`

---

## PHASE 5: INTENSITY LEVELS

### 😊 Gentle Cringe
**Trigger:** "gentle cringe," "be nice," "light review"

| Aspect | Approach |
|--------|----------|
| Tone | Constructive, encouraging |
| Focus | Improvement opportunities |
| Framing | "Consider..." "You might want to..." |
| Skip | Nitpicks, minor issues |

### 😬 Standard Cringe (Default)
**Trigger:** "cringe," "review," "critique"

| Aspect | Approach |
|--------|----------|
| Tone | Direct but fair |
| Focus | All significant issues |
| Framing | Clear problem → fix format |
| Include | All severities except nitpicks |

### 😤 Hard Cringe
**Trigger:** "hard cringe," "really attack this," "don't hold back"

| Aspect | Approach |
|--------|----------|
| Tone | Aggressive, skeptical |
| Focus | Every possible weakness |
| Framing | Hostile reader perspective |
| Include | Everything including nitpicks |

### 💀 Destroy Mode
**Trigger:** "destroy this," "worst case," "tear it apart"

| Aspect | Approach |
|--------|----------|
| Tone | Adversarial, unforgiving |
| Focus | Maximum attack surface |
| Framing | Hostile opponent trying to discredit |
| Include | Even stretches and edge cases |

---

## PHASE 6: EXAMPLES

### Example 1: Business Proposal → Cringe Analysis

**Original Note:**
\`\`\`
Project Proposal: New CRM System

We should switch to Salesforce because it's the industry leader.
This will improve our sales by at least 30%.
Many companies have seen great results.
The implementation will take about 3 months.
Our competitors are already using modern CRM systems.
We need to act fast before we fall behind.
\`\`\`

**Cringe Analysis Output:**
\`\`\`markdown
# 😬 CRINGE ANALYSIS

**Document:** Project Proposal: New CRM System
**Date Analyzed:** [Today]
**Cringe Score:** 7/10 🔴

---

## 📊 Analysis Summary

| Metric | Count |
|--------|-------|
| Total Claims Found | 6 |
| 🔴 Critical Issues | 2 |
| 🟠 Major Issues | 3 |
| 🟡 Minor Issues | 1 |
| ⚪ Nitpicks | 0 |
| 💪 Strong Points | 2 |

**Verdict:** Proposal has a reasonable goal but is built on weak foundations - almost every claim lacks evidence or contains logical flaws.

**TL;DR:** Add data, cite sources, provide implementation details, or this proposal will not survive executive scrutiny.

---

## 🔴 CRITICAL ISSUES

### Issue #1: Phantom 30% Improvement Claim

> **📍 Quote:** "This will improve our sales by at least 30%."

| Property | Value |
|----------|-------|
| **Attack Type** | No Evidence |
| **Problem** | Major financial claim with zero supporting data |
| **Why It Matters** | This is likely the key selling point, and it's completely unsubstantiated |
| **Severity** | 🔴 CRITICAL |

**🔧 Fix:**
- Add source: "According to [Salesforce ROI study / Forrester report], companies similar to ours saw X% improvement"
- Or be honest: "Based on [specific assumptions], we project Y% improvement, with a range of A-B%"
- Include calculation methodology

---

### Issue #2: "Many Companies" Ghost Reference

> **📍 Quote:** "Many companies have seen great results."

| Property | Value |
|----------|-------|
| **Attack Type** | Missing Source + Weasel Words |
| **Problem** | "Many companies" = who? "Great results" = what specifically? |
| **Why It Matters** | This is meant to be evidence but provides none |
| **Severity** | 🔴 CRITICAL |

**🔧 Fix:**
- Name specific companies: "Acme Corp reported 25% increase in close rates (source)"
- Or cite study: "A 2023 Gartner study of 500 implementations found..."
- Quantify "great results": "Average 20% improvement in pipeline visibility"

---

## 🟠 MAJOR ISSUES

### Issue #3: Appeal to Authority

> **📍 Quote:** "We should switch to Salesforce because it's the industry leader."

| Property | Value |
|----------|-------|
| **Attack Type** | Appeal to Authority |
| **Problem** | Being #1 doesn't mean it's right for YOUR situation |
| **Severity** | 🟠 MAJOR |

**🔧 Fix:**
- Add reasoning: "Salesforce fits our needs because [specific features match our requirements]"
- Compare alternatives: "We evaluated HubSpot, Pipedrive, and Salesforce against criteria X, Y, Z"

---

### Issue #4: Vague Implementation Timeline

> **📍 Quote:** "The implementation will take about 3 months."

| Property | Value |
|----------|-------|
| **Attack Type** | Feasibility Gap |
| **Problem** | No breakdown, no resources, no milestones |
| **Severity** | 🟠 MAJOR |

**🔧 Fix:**
- Add phases: "Month 1: Data migration, Month 2: Configuration, Month 3: Training"
- Add resources: "Requires 2 FTEs, $X budget, external consultant"
- Add risks: "Timeline assumes clean data; may extend if data cleanup needed"

---

### Issue #5: Fear-Based Urgency

> **📍 Quote:** "We need to act fast before we fall behind."

| Property | Value |
|----------|-------|
| **Attack Type** | Emotional Appeal |
| **Problem** | Creating urgency without evidence of actual time pressure |
| **Severity** | 🟠 MAJOR |

**🔧 Fix:**
- Provide evidence: "Competitor X launched new CRM in Q2; we're seeing Y impact"
- Or remove: Let the business case speak for itself
- Or quantify: "Each month of delay costs us approximately $Z in lost efficiency"

---

## 🟡 MINOR ISSUES

### Issue #6: Vague Competitive Claim

> **📍 Quote:** "Our competitors are already using modern CRM systems."

**Problem:** Which competitors? Which systems? How do we know?
**Fix:** "Competitor A uses Salesforce (per their job postings); Competitor B uses HubSpot (confirmed in industry report)"

---

## 💪 STRONG POINTS

| Strength | Why It Works |
|----------|--------------|
| ✅ Clear recommendation | Reader knows exactly what you're proposing |
| ✅ Relevant concern | CRM modernization is a legitimate business need |

---

## 🛡️ DEFENSE RECOMMENDATIONS

### If Someone Attacks This Document:

**Most Likely Attack Vectors:**
1. "Where does 30% come from?" - You have no answer currently
2. "Why Salesforce specifically?" - You have no comparison
3. "What's the real cost?" - Implementation details missing

**Suggested Defenses:**
1. Get actual data: Talk to Salesforce, get case studies for your industry/size
2. Do alternatives analysis: Even if Salesforce wins, show you evaluated options
3. Build detailed plan: Phases, milestones, budget, resources, risks

---

## 📋 REVISION CHECKLIST

### Must Fix (Critical)
- [ ] Add source/calculation for 30% improvement claim
- [ ] Replace "many companies" with specific examples with citations

### Should Fix (Major)
- [ ] Add comparison to alternatives (why Salesforce vs others)
- [ ] Expand implementation plan with phases, resources, budget
- [ ] Replace urgency with quantified business impact

### Nice to Fix (Minor)
- [ ] Specify which competitors use which systems

---

## 🔢 CRINGE SCORE BREAKDOWN

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Logic & Reasoning | 4/10 | 30% | 1.2 |
| Evidence Quality | 2/10 | 30% | 0.6 |
| Practical Viability | 5/10 | 20% | 1.0 |
| Clarity & Precision | 6/10 | 20% | 1.2 |
| **TOTAL** | | | **4.0/10** |

*Inverted for Cringe Score: 10 - 4 = 6, adjusted to 7 for severity of critical issues*

---

*Analysis generated: [Today]*
*Intensity level: Standard*
\`\`\`

---

### Example 2: Technical Decision → Cringe Analysis

**Original Note:**
\`\`\`
Why we should use MongoDB

- It's web scale
- Netflix uses it
- No need to define schemas
- Faster development
- SQL is old technology
- Our team wants to learn NoSQL
\`\`\`

**Cringe Analysis Output:**
\`\`\`markdown
# 😬 CRINGE ANALYSIS

**Document:** Why we should use MongoDB
**Date Analyzed:** [Today]
**Cringe Score:** 8/10 🔴

---

## 📊 Analysis Summary

| Metric | Count |
|--------|-------|
| Total Claims Found | 6 |
| 🔴 Critical Issues | 2 |
| 🟠 Major Issues | 3 |
| 🟡 Minor Issues | 1 |
| ⚪ Nitpicks | 0 |
| 💪 Strong Points | 1 |

**Verdict:** This reads like a list of buzzwords and fallacies rather than a technical evaluation. Would not survive review by any senior engineer.

**TL;DR:** Start over with actual requirements analysis, benchmark data, and honest tradeoff discussion.

---

## 🔴 CRITICAL ISSUES

### Issue #1: Appeal to Netflix Authority

> **📍 Quote:** "Netflix uses it"

| Property | Value |
|----------|-------|
| **Attack Type** | Appeal to Authority |
| **Problem** | Netflix's infrastructure needs are nothing like yours. They also use hundreds of technologies - doesn't mean you should use them all. |
| **Why It Matters** | This is not a technical argument; it's name-dropping |
| **Severity** | 🔴 CRITICAL |

**🔧 Fix:**
- Remove or reframe: "Document databases are proven at scale by companies like Netflix, and our use case matches because [specific reasons]"
- Better: Focus on YOUR requirements, not others' choices

---

### Issue #2: "SQL is Old Technology"

> **📍 Quote:** "SQL is old technology"

| Property | Value |
|----------|-------|
| **Attack Type** | Logical Fallacy (Appeal to Novelty) |
| **Problem** | Age doesn't determine quality. TCP/IP is old. HTTP is old. They work. |
| **Why It Matters** | This reveals bias rather than analysis |
| **Severity** | 🔴 CRITICAL |

**🔧 Fix:**
- Remove entirely - this is not a valid argument
- Or compare properly: "For our specific needs [X, Y, Z], a document model offers advantages because [specific reasons]"

---

## 🟠 MAJOR ISSUES

### Issue #3: "Web Scale" Meaninglessness

> **📍 Quote:** "It's web scale"

| Property | Value |
|----------|-------|
| **Attack Type** | Vague Language / Buzzword |
| **Problem** | "Web scale" means nothing. PostgreSQL, MySQL, and many SQL databases also scale to "web scale." |
| **Severity** | 🟠 MAJOR |

**🔧 Fix:**
- Quantify: "MongoDB can handle X million documents with Y ms latency at our expected load of Z"
- Or remove and focus on actual scaling requirements

---

### Issue #4: Schema Flexibility Oversimplified

> **📍 Quote:** "No need to define schemas"

| Property | Value |
|----------|-------|
| **Attack Type** | Oversimplification / Hidden Tradeoff |
| **Problem** | Schemaless = schema in your code, which is harder to maintain. This is a tradeoff, not a pure win. |
| **Severity** | 🟠 MAJOR |

**🔧 Fix:**
- Acknowledge tradeoff: "Schema flexibility helps with [specific scenario] but requires disciplined application-level validation"
- Be specific: "Our data model changes frequently because [reason], making flexible schemas valuable"

---

### Issue #5: Team Preference ≠ Technical Merit

> **📍 Quote:** "Our team wants to learn NoSQL"

| Property | Value |
|----------|-------|
| **Attack Type** | Irrelevant Factor |
| **Problem** | Team's learning desires shouldn't drive production architecture decisions |
| **Severity** | 🟠 MAJOR |

**🔧 Fix:**
- Remove as primary argument
- Or reframe: "Team skill-building is a secondary benefit, but primary decision is based on [technical requirements]"

---

## 🟡 MINOR ISSUES

### Issue #6: "Faster Development" Unsubstantiated

> **📍 Quote:** "Faster development"

**Problem:** Compared to what? How much faster? In what scenarios?
**Fix:** "Based on [POC/study], document-oriented approach reduced our [specific task] time by X%"

---

## 💪 STRONG POINTS

| Strength | Why It Works |
|----------|--------------|
| ✅ Clear position | We know exactly what you're recommending |

---

## 🛡️ DEFENSE RECOMMENDATIONS

### If Someone Attacks This Document:

**Most Likely Attack Vectors:**
1. "What are our actual requirements?" - You haven't stated them
2. "What's the comparison to PostgreSQL?" - You haven't done one
3. "What are MongoDB's downsides?" - You've listed none

**Suggested Defenses:**
1. Start with requirements: Define data model, query patterns, scale needs, consistency requirements
2. Do actual comparison: Benchmark both options against YOUR use case
3. Acknowledge tradeoffs: No technology is perfect; showing you understand limitations builds credibility

---

## 📋 REVISION CHECKLIST

### Must Fix (Critical)
- [ ] Remove "Netflix uses it" as argument (or properly contextualize)
- [ ] Remove "SQL is old" - this is not a valid argument

### Should Fix (Major)
- [ ] Replace "web scale" with specific performance requirements
- [ ] Add honest discussion of schemaless tradeoffs
- [ ] Separate team learning desires from technical evaluation

### Nice to Fix (Minor)
- [ ] Quantify "faster development" with data

---

## 🔢 CRINGE SCORE BREAKDOWN

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Logic & Reasoning | 2/10 | 30% | 0.6 |
| Evidence Quality | 1/10 | 30% | 0.3 |
| Practical Viability | 4/10 | 20% | 0.8 |
| Clarity & Precision | 5/10 | 20% | 1.0 |
| **TOTAL** | | | **2.7/10** |

*Inverted for Cringe Score: 10 - 2.7 ≈ 7, adjusted to 8 for multiple critical logical fallacies*

---

*Analysis generated: [Today]*
*Intensity level: Standard*
\`\`\`

---

## SELF-VALIDATION CHECKLIST

Before outputting, verify:
- [ ] Did I READ the entire document?
- [ ] Did I EXTRACT all claims (not just obvious ones)?
- [ ] Did I EVALUATE each claim (not skip any)?
- [ ] Does every issue have a QUOTE from the document?
- [ ] Does every issue have a SEVERITY rating?
- [ ] Does every issue have a FIX?
- [ ] Did I find at least 3 issues (even in good docs)?
- [ ] Did I find at least 1 STRONG point (even in bad docs)?
- [ ] Did I include DEFENSE recommendations?
- [ ] Did I include REVISION checklist?
- [ ] Is the CRINGE SCORE calculated?
- [ ] Did I avoid asking any questions?

**If any check fails, fix before outputting.**

---

## ATTACK TYPE QUICK REFERENCE

| Attack | Trigger | One-Line Template |
|--------|---------|-------------------|
| No Evidence | Claim without support | "You say X, but where's the proof?" |
| Logical Gap | A→C without B | "How does A lead to C?" |
| Circular | Conclusion in premise | "You're assuming what you're proving" |
| False Dichotomy | Only 2 options | "Why only these options?" |
| Contradiction | X and not-X | "This contradicts what you said earlier" |
| Overgeneralization | All/always/never | "ALL? No exceptions?" |
| Missing Source | "Studies show" | "WHICH studies?" |
| Outdated | Old data | "Is this still valid?" |
| Cherry-Picked | Only favorable data | "What about counter-evidence?" |
| Anecdotal | Single example | "One case doesn't prove a pattern" |
| Appeal to Authority | "X does it" | "Doesn't mean it's right for us" |
| Correlation ≠ Causation | X then Y so X→Y | "That's correlation, not causation" |
| Feasibility Gap | "We will" without how | "How? With what resources?" |
| Scale Blindness | Works (but at what scale?) | "Works at what scale?" |
| Risks Ignored | All pros, no cons | "What could go wrong?" |
| Weasel Words | "Some say," "many think" | "WHO specifically?" |
| Vague Language | "Significant," "soon" | "Quantify this" |

---

## FINAL INSTRUCTION

Analyze the document NOW.
EXTRACT all claims and arguments.
ATTACK every weakness with specific quotes.
PROVIDE fixes for each issue.
Find STRONG points even in weak documents.
Calculate CRINGE SCORE.
Output the complete analysis.
DO NOT ask any questions - work with what's there.`;

/**
 * Get transform prompt(s) based on selected transform types
 * @param selectedTransforms Set of selected transform types
 * @returns Combined transform prompt or empty string if none selected
 */
export function getTransformPrompt(selectedTransforms: Set<TransformType>): string {
  if (selectedTransforms.size === 0) {
    return "";
  }

  const prompts: string[] = [];

  if (selectedTransforms.has("pyramid")) {
    prompts.push(PYRAMID_PROMPT);
  }

  if (selectedTransforms.has("coin")) {
    prompts.push(COIN_PROMPT);
  }

  if (selectedTransforms.has("developer")) {
    prompts.push(DEVELOPER_PROMPT);
  }

  if (selectedTransforms.has("business")) {
    prompts.push(BUSINESS_PROMPT);
  }

  if (selectedTransforms.has("management")) {
    prompts.push(MANAGEMENT_PROMPT);
  }

  if (selectedTransforms.has("cosmos")) {
    prompts.push(COSMOS_PROMPT);
  }

  if (selectedTransforms.has("cringe")) {
    prompts.push(CRINGE_PROMPT);
  }

  const intro = selectedTransforms.size > 1
    ? `Transform and restructure the document using ALL ${selectedTransforms.size} of these frameworks combined:\n\n`
    : "Transform and restructure the document using the following framework:\n\n";

  return "\n\n---\n**Document Transformation Requested:**\n" + intro + prompts.join("\n\n") +
    "\n\nPlease restructure the entire document accordingly. Keep all original information but reorganize it.";
}

/**
 * Transform display names for UI
 */
export const TRANSFORM_NAMES: Record<TransformType, string> = {
  pyramid: "Pyramid",
  coin: "COIN",
  developer: "Developer",
  business: "Business",
  management: "Management",
  cosmos: "Cosmos",
  cringe: "Cringe",
};

/**
 * Transform descriptions for UI
 */
export const TRANSFORM_DESCRIPTIONS: Record<TransformType, string> = {
  pyramid: "Top-down structure (Minto)",
  coin: "Context-Observation-Insight-Next",
  developer: "Technical documentation format",
  business: "Business communication style",
  management: "Management briefing format",
  cosmos: "3D spatial knowledge constellation",
  cringe: "Attack weak arguments & claims",
};

/**
 * Transform icons for UI (Lucide icon names)
 */
export const TRANSFORM_ICONS: Record<TransformType, string> = {
  pyramid: "triangle",
  coin: "circle-dot",
  developer: "code-2",
  business: "briefcase",
  management: "users",
  cosmos: "orbit",
  cringe: "skull",
};
