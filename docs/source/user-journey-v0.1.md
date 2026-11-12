# Shared World — POC User Journey v0.1

Sanitized text export of the existing journey; original document layout is available in DOCX and PDF.



PRODUCT WORKING DOCUMENT


Shared World — POC User Journey
Version 0.1 · November 8, 2026 · Project working copy
Audience: founder and future designer or developer

 A shared world where people create with words and others continue their ideas, building places and
 stories together.

This document specifies the user journey the proof of concept must support so it can be built and tested. It is not a
record of completed tests, research findings, or market validation. It is not a full product requirements document,
visual specification, or marketing brief. No implementation has started. Visual style and art direction are deferred.

1. Purpose
Shared World is one public illustrated world. It begins as a small area and grows through contributions. It is not a set of
separate worlds for different groups. People arrive, understand a place by exploring it, write an idea, preview a private
interpretation, publish that idea into the shared world on purpose, invite someone to continue it, and later see
whether anything real has changed.
The proof-of-concept core is this loop: phrase → coherent local private preview → explicitly publish a persistent shared
contribution → another person continues it → the original author recognizes an actual change and preserved
attribution. Documentation and UI copy are in English.
Aerial exploration and optional closer viewing are experience directions only. They do not commit the proof of
concept to photorealistic realtime 3D or a first-person point of view. Visual implementation remains pending.
This document stands on its own. 


2. Confirmed decisions and current proposals
Items on the left are agreed product decisions. Items on the right are current proposals or open directions; they should
not be treated as locked requirements.

 Confirmed                                                                 Proposed / not locked
  • One public shared illustrated world, starting small and                • A small supported visual catalog and a limited set of
    growing through contributions—not separate worlds per                     relations—not an arbitrary universal simulation.
    group.                                                                 • Aerial exploration with optional closer viewing, without
  • People create with words; others continue those ideas.                    requiring photoreal 3D or a first-person camera.
  • English documentation and English UI copy.                             • Persistent author identity is established at publication.
  • User journey first; visual style and art direction later.                 The method is undecided and is not tied to a named
  • No account needed to explore or to try an idea.                           authentication provider.
  • Publishing is explicit and intentional.                                • If a payment sandbox is ever shown, it must be an explicit
                                                                              simulation with no charges. A real payment experiment
  • Attribution and history are preserved; no destructive
                                                                              is out of scope.
    overwrites.
                                                                           • First testers: friends and micro-communities. They are a
  • The creator chooses when to copy or share a contextual
                                                                              convenient starting group, not a validated audience.
    link; the product does not auto-post or auto-message.
                                                                           • Keep the build small—on the order of a ~40-hour scope
  • No signup wall to view or try; no external notifications in
                                                                              constraint, not a delivery guarantee. No build stack is
    the POC.
                                                                              chosen here.
  • No real payment barrier in the POC. Monetization is a
    later hypothesis, not a promise that the product is free
    forever, and this document invents no prices.
  • No real implementation has started.








3. Journey overview
The journey is one continuous loop through a single shared world. A person may first hear about a place through a
hypothetical social post or a personal referral that points at a specific creation; that is an example of discovery, not a
campaign result or a metric.

          1                     2                  3                       4             5                  6                   7
  Arrive in context        Explore and      Write a first idea    Private preview      Publish      Invite continuation     Return to
                           understand                                               intentionally                         consequences



What success means: two people complete this loop without coaching. One creates; the other understands and
continues; the first recognizes the response. Success is not a generated image, a screenshot, a signup, or a share-
button click. Completing a small test does not validate market demand or willingness to pay.

4. The seven stages
Each stage lists the user’s intent, the action they take, how the system should respond, key English UI copy, and the
condition that means the stage works.

1 Arrive in context
 Intent               Land somewhere meaningful, not an empty generic home.
 Action               A shared link opens the exact creation—for example, a café for birds—with enough surrounding
                      context to understand it. Opening the product directly shows the small world and a suggested
                      starting point. No account is needed to explore.
 System               Load the shared world at the intended location and make the place readable in context. Do not force
                      a tutorial wall or an account gate before exploration.
 UI copy              “You arrived at [creation name].”
                      “This is the shared world. Start here: [suggested place].”
                      “Explore freely — no account needed.”
 Accept               A visitor following a contextual link sees that exact creation in context. A visitor opening the world
                      without a link sees a small, readable world and a suggested starting point. Neither is asked to sign up
                      before exploring.

2 Understand through exploration
 Intent               Learn what a place is, who shaped it, and what changed, without leaving the scene.
 Action               Select the café, or another object, to inspect it. The primary action offered is to add an idea.
 System               Keep the visitor in the scene. Open a context panel showing what the object is, who contributed, and
                      what changed. Offer Add your idea as the primary action. Do not interrupt with a tutorial wall.
 UI copy              “Café for birds”
                      “Created by [author]. Continued by [contributor].”
                      “What changed: [brief history].”
                      “Add your idea”
 Accept               Selecting an object reveals what it is, who contributed, and what changed, while the scene stays
                      visible. The obvious next step is Add your idea.








3 Write a first idea
 Intent            Contribute in words—either into available world space or by continuing an existing contribution.
 Action            Write a short phrase. Example: “A bus stop for the café’s regulars.” Optional suggestions may support
                   free text; they do not replace it.
 System            Accept free text against a small supported catalog and set of relations. If the concept is unsupported,
                   say so honestly. Do not silently approximate an unsupported idea.
 UI copy           “What would you add?”
                   “A bus stop for the café’s regulars.”
                   “Describe a place, object, or continuation in a short phrase.”
                   “Ideas you can try”
                   “This idea isn’t supported yet. Try describing something the world can hold.”
 Accept            A visitor can add something new to available space or continue an existing contribution using free
                   text. Unsupported concepts are named as unsupported.

4 Private preview
 Intent            See how the world would interpret the idea before anyone else can see it.
 Action            Review the supported interpretation in the scene, read a brief explanation, then edit or discard.
 System            Show a coherent local private preview of the supported interpretation, plus a short explanation.
                   Preserve the draft. Other visitors see no change. If the input is unsupported, offer a correction path—
                   never a silent approximation.
 UI copy           “Private preview — only you can see this.”
                   “Here’s how the world understood your idea.”
                   “Edit idea”
                   “Discard draft”
                   “This looks right”
                   “We couldn’t place this yet. Your draft is saved — try a supported idea.”
 Accept            The author sees a private, in-scene preview and can edit or discard it. Nothing is visible to others
                   before publish. Drafts survive unsuccessful attempts. Unsupported input is not silently rewritten.

5 Publish intentionally
 Intent            Make the contribution part of the shared world, on purpose.
 Action            Confirm publication. Persistent author identity is established at this moment; the method is still
                   undecided and must not require a named authentication provider.
 System            Ask for explicit confirmation. Revalidate the current world state on the server, preserve earlier
                   attribution, and publish once. Do not destructively overwrite prior work. Do not place a real payment
                   barrier in front of publishing. If a payment sandbox is ever present, label it clearly as a simulation and
                   charge no one. Monetization remains a hypothesis; invent no prices and do not promise that the
                   product will be free forever.
 UI copy           “Publish this to the shared world?”
                   “Once published, other people can see it and continue it. You’ll be credited as its author.”
                   “Publish”
                   “Keep editing”
                   “Published. It’s part of the shared world.”
                   “Simulation only — you will not be charged.”
 Accept            Nothing becomes public until explicit confirmation. Publication happens once, after server
                   revalidation, with attribution preserved and no destructive overwrite. No real payment is required.








6 Invite continuation
 Intent            Bring someone specific to this exact creation so they can continue it.
 Action            The creator deliberately copies or shares a contextual link. The product does not auto-post or send a
                   message on their behalf.
 System            Provide a copyable contextual link that opens the exact creation and its history, plus an invitation to
                   continue. Recipients can view and try without signing up.
 UI copy           “Invite someone to continue this”
                   “Copy link”
                   “What would you add?”
                   “You can look around and try an idea without an account.”
 Accept            Sharing is a deliberate user action. The link lands on the exact creation with its history visible and
                   What would you add? present. Viewing and trying do not require signup.

7 Return to real consequences
 Intent            See whether anyone actually continued the work.
 Action            The original author revisits the creation by opening the world or the same contextual link. No external
                   notification is sent.
 System            If a second person published a supported continuation, show real in-product changes since the
                   author’s last visit, tied to their contribution, with attribution. If nothing happened, leave the world
                   unchanged. Do not invent participants, activity, or social proof.
 UI copy           “Since you were last here: [contributor] continued your [creation].”
                   “Added: [continuation].”
 Accept            After a real continuation by another person, the author recognizes an actual change connected to
                   their contribution, with attribution preserved. If nothing was published, nothing appears to have
                   changed. No invented activity and no external notifications.
If nothing has changed, do not display a fabricated activity state; the place simply looks as the author left it.


5. Non-happy paths
These cases are part of the journey, not afterthoughts.
 • Unsupported or invalid phrase. Say clearly that the idea is not supported. Preserve the draft and offer a path to
   revise. Never silently approximate. UI: “This idea isn’t supported yet. Your draft is saved. Try describing something
   the world can hold.”
 • Preview or generation failure. Keep the draft. Explain that the preview could not be created and invite a retry or
   edit. Other visitors remain unaffected. UI: “We couldn’t create a preview. Your draft is saved — try again.”
 • Double-click or repeated publish. Publishing the same confirmed draft is idempotent: do not create a duplicate
   contribution. If useful, show “Already published.”
 • Concurrent change. If the world changed while the author was previewing, show an updated preview of the
   current state and require a fresh confirmation before publish. Do not overwrite the other change. UI: “The world
   changed while you were previewing. Review the updated preview and confirm again to publish.”
 • Moderated or unavailable target. If the object or area cannot receive a contribution because it has been
   moderated, removed, or is otherwise unavailable, show a clear state and do not pretend publish succeeded. UI:
   “This place can’t receive a new idea right now.”
Public safeguards for the proof of concept: the world is public, but a limited publishing test may be access-controlled.
Basic moderation and abuse limits apply. Uploads of personal information are not supported.








6. Minimal screens
The proof of concept needs a small set of surfaces, not a large screen inventory. Visual treatment is explicitly deferred.
No art direction is implied here.
 • World view, with object context and history. The shared illustrated area, starting small. Selecting an object
   keeps the scene visible and opens a panel covering what it is, who contributed, and what changed, with Add your
   idea as the primary action.
 • Composer and private preview. Phrase input, optional suggestions, an in-scene private preview, a brief
   explanation, and edit or discard. The surface is clearly marked as private.
 • Publish confirmation, success, and share. An explicit confirm step, a success state, and a copyable contextual
   link. No automatic posting or messaging.
 • In-world changes on return. The same world view, now showing real published continuations and a concise note
   of what changed since the last visit—only when something actually changed.
Exploration may feel aerial, with optional closer viewing. That remains an experience direction, not a requirement for
photoreal realtime 3D or a first-person camera.

7. Test script for participants A and B
The central behavioral test is whether two people can complete the loop without coaching. Use two independent
sessions—two browsers or two devices. After the opening instruction, observe; do not prompt people through the
interface. Do not invent participants or seed fake activity.
Setup. Prepare the small shared world with at least one readable starting place (example: a café for birds). Give each
person only the English product and the instructions below.

Participant A — create
 • Open the world from direct or home entry. No account should be required.
 • Explore until a place is understood.
 • Add an idea in words. Let A write a supported phrase of their own. Offer an example only if they ask before the
   uncoached run: “A bus stop for the café’s regulars.”
 • Review the private preview. B may refresh at this moment to confirm they cannot see A’s draft.
 • Publish intentionally.
 • Copy the contextual link and give it to B through whatever channel they already use. The product itself must not
   send it.

Participant B — understand and continue
 • Open A’s contextual link. There must be no signup wall.
 • Recognize A’s creation and its context and history.
 • Continue it with a supported idea.
 • Preview privately, then publish.

Participant A — return
 • Revisit the same place through the link or the world. If the session is still open, refresh to confirm the change
   persists.
 • Recognize a real change tied to their contribution, with B’s attribution.
 • If B published nothing, A should see no change.








Pass condition
Pass only if A creates, B understands and continues without being walked through the interface, and A recognizes the
response. Generation quality, screenshots, signups, and share-button clicks are not the pass condition. This test does
not claim market validation or willingness to pay.
Proposed initial testers are friends and micro-communities. They are a convenient first group, not a validated
audience.

8. Events and measures
Record enough to see whether the loop happened. This document sets no numerical targets, conversion goals, or
success thresholds.
Suggested events — descriptive only, not key-performance-indicator targets:
 • World opened, distinguishing home or direct entry from a contextual link.
 • Object selected, or context and history panel opened.
 • Idea draft started; private preview shown; preview edited or discarded.
 • Unsupported phrase shown to the writer.
 • Publish confirmed; publish succeeded; publish blocked (concurrent change, unavailable target, or failed
   validation).
 • Contextual link copied.
 • Return visit where changes since last visit were shown; return visit where nothing had changed.
Watch qualitatively, without inventing scores:
 • Could B understand A’s creation from the link alone?
 • Did the preview stay private until publish?
 • Was attribution preserved on both contributions?
 • Did A recognize a real change without being told what to look for?
 • Did failure states keep drafts and avoid duplicates or silent approximation?
Do not treat signup counts, share clicks, or image-generation success as proof that the journey works.

9. Scope and open decisions

In scope
Contextual arrival; explore without login; supported text creation; preview and revise; identity at publish; persistent
shared updates; attribution and history; contextual share; real in-product changes on return. Basic public safeguards:
the world is public, though a limited publishing test may be access-controlled; moderation and abuse limits; no
personal-information uploads.

Out of scope
Final visual or art style; fully photoreal realtime 3D; voice; uploads; capsules, gifts, or treasure hunts; clubs or entry
fees; creator payouts; a simulated world economy; external notifications; a real payment experiment. This document
does not introduce a build stack or commit to a delivery date.

Open decisions
 • How minimal author identity is established at publication.
 • The supported catalog and the transformations or relations it allows.
 • Who can publish during the initial test, even though the world remains public to view.
 • Whether and how a payment experiment happens later—not in this proof of concept, and with no prices defined
   here.
A desired effort on the order of ~40 hours is a scope constraint to keep the build small. It is not a delivery commitment.

End of working document · Shared World — POC User Journey · Version 0.1 · November 8, 2026



