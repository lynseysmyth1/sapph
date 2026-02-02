# Onboarding – All Pages Readout

Reference list of every step/screen in onboarding (for rebuild or reference).  
Step types: **intro** (text + Next), **completion** (text + Finish), **text**, **textarea**, **radio**, **checkbox**, **photos**, **group**.

---

## Section: About you (Steps 1–10)

| # | Index | Type | ID | Content |
|---|-------|------|-----|---------|
| 0 | 0 | intro | intro_details | **Body:** "Let's get started with some details about you" |
| 1 | 1 | text | name_dob | **Label:** "What's your name?" · **Sublabel:** "And date of birth" · alsoCollectDob: true · required |
| 2 | 2 | checkbox | pronouns | **Label:** "What are your pronouns?" · required · options: She, Her, They, Them, He, Him, Prefer not to say, Other |
| 3 | 3 | radio | gender_identity | **Label:** "How do you identify?" · required · options: Agender, Androgynous, Bigender, Gender fluid, Gender non conforming, Gender queer, Intersex, Non binary, Pangender, Trans person, Trans woman, Transfeminine, Transmasculine, Trans non-binary, Woman |
| 4 | 4 | radio | gender_expression | **Label:** "What's your gender expression?" · required · options: Androgynous / Andro, Butch, Chapstick, Femme, Futch, Gender non conforming, High femme, Masc, Masc-of-centre, Queer femme, Queer masc, Sapphic, Soft butch, Stem, Tomboy |
| 5 | 5 | radio | sexual_identity | **Label:** "How do you identify sexually?" · required · options: Asexual, Bisexual, Demisexual, Gay, Lesbian, Pansexual, Queer, Questioning, Other |
| 6 | 6 | text | height | **Label:** "What's your height?" · placeholder: "e.g. 5'6\"" · required |
| 7 | 7 | text | location | **Label:** "Where do you live?" · placeholder: "City and area" · required |
| 8 | 8 | text | hometown | **Label:** "Where's your home town?" · placeholder: "City, Country" · required |
| 9 | 9 | radio | children | **Label:** "Do you have children?" · required · options: Child free, Child free dating people with children, Have children (don't want more / open to more), Want children, Prefer not to say |
| 10 | 10 | text | job_title | **Label:** "What's your job title?" · placeholder: "What do you do?" · required |

---

## Section: Your profile (Steps 1–8 of 8)

| # | Index | Type | ID | Content |
|---|-------|------|-----|---------|
| 11 | 11 | intro | intro_profile | **Body:** "Now let's build out your profile so everyone knows how awesome you are" |
| 12 | 12 | photos | photos | **Label:** "Add photos (optional)" · hint: headshot recommendation · min: 0, max: 6 · not required |
| 13 | 13 | textarea | bio | **Label:** "Next we'd love you to tell people a little bit more about yourself with a short bio." · hint: what you love, how you spend time · placeholder: "Write your bio..." · maxLength: 500 · required |
| 14 | 14 | textarea | conversation_starter | **Label:** "Now we have our conversation starter" · hint: kick start first chat · placeholder: "e.g. Ask me about my favourite hike..." · maxLength: 200 · not required |
| 15 | 15 | checkbox | connection_goals | **Label:** "What are your connection goals?" · required · options: Friends, Hookup, Life partner, Long term, Long term open to short, Relationship, Short term, Short term open to serious |
| 16 | 16 | checkbox | relationship_style | **Label:** "What style of relationship are you looking for?" · required · options: ENM, Exploring, Figuring it out, Monogamy, Non monogamous, Poly, Prefer not to say |
| 17 | 17 | group | vices | **Heading:** "Tell us a little about any vices" · fields: Smoking (radio: No, Sometimes, Vape, Yes), Drinking (No, Sometimes, Yes), Weed (No, Sometimes, Yes), Drugs (No, Sometimes, Yes) · all required |
| 18 | 18 | checkbox | pets | **Label:** "Pets are an important part of our lives — we'd love to know if you have any" · required · options: Birds, Cat, Dog, Fish, No pets, Reptile, Small animal |
| 19 | 19 | radio | zodiac_sign | **Label:** "Finally we'd love to know what zodiac sign you are" · hint: "key in any queer relationship ✨" · required · options: Aries … Pisces (all 12) |

---

## Section: Final details (Steps 1–2 of 2, then completion)

| # | Index | Type | ID | Content |
|---|-------|------|-----|---------|
| 20 | 20 | intro | intro_intimate | **Body:** "To finish a couple of more intimate questions, if you don't mind" · note: can hide on profile or skip |
| 21 | 21 | checkbox | sex_preferences | **Label:** "What is your sexual preference?" · not required · options: Bottom, Pillow princess, Power bottom, Power top, Service top, Stone top, Switch, Top, Prefer not to share |
| 22 | 22 | checkbox | kinks | **Label:** "Do you have any kink preferences?" · not required · options: BDSM, Being dominant, Being watched, Being submissive, Bondage, Group dynamics, Role play, Toys, Watching, Prefer not to share |
| 23 | 23 | completion | done | **Body:** "That's great!\nYou're all set!" · **Note:** "If you want to filter profiles you're seeing, just tap the icon on the top right." · **CTA:** Finish (saves profile and goes to /home) |

---

## Summary

- **Total steps:** 24 (indices 0–23).
- **Section titles in UI:** "About you" (step 1–10), "Your profile" (step 1–8), "Final details" (step 1–2); intro/completion steps may hide the step counter.
- **Profile fields saved:** full_name, dob, height, location, hometown, ethnicity, job_title, children, zodiac_sign, politics, drinking, smoking, marijuana, drugs, gender_identity, gender_expression, sexual_identity, bio, conversation_starter, onboarding_completed, photos, pronouns, connection_goals, relationship_style, sex_preferences, kinks, visibility_settings, pets.
- **Navigation:** Back (except on first step and intro/completion), Next (or Finish on completion step). Validation runs before Next/Finish; completion step triggers save (upsert to `profiles`, then navigate to `/home`).
