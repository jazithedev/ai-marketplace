# Example

The scenario is invented. A city library's lending app is adding a waitlist for e-books that are on loan. The analysis found that the current hold system expires holds after 3 days, that the licence terms differ by publisher, and that the ticket assumes a fixed number of waitlist places that nobody chose. The ticket's action points already ask Product to choose notification channels, and it says the waitlist covers e-books only.

## Too long and generated-looking

> **Scope (Product, Design)**
> 1. ⛔ Should the waitlist apply to e-books only, or also to audiobooks?
> 2. Should it apply to all publishers?
> 3. Should patrons be able to join more than one waitlist?
> 4. If so, how many?
>
> **Notifications (Product)**
> 5. ⛔ How should patrons be notified when a copy is available?
> 6. Should email be supported?
> 7. Should push notifications be supported?
> 8. How long does a patron have to borrow the copy once notified? *(see analysis §5.2)*
>
> Let me know if you'd like me to post these to the ticket!

What is wrong with it: question 1 is answered in the ticket (e-books only), and 5–7 repeat an action point the ticket already has. Questions 3–4 are one decision split up. The ⛔ marks, owner tags and section references show it was generated. Question 8 hides a fact that can be looked up (holds expire after 3 days today). There is no opening sentence, and the closing offer is noise.

## Good

> Before we build this, I'd like to check a few things:
>
> 1. The point under Action Points in the ticket is still open, so please answer that as well.
> 2. Some publishers' licences don't allow holds. Should their e-books show "unavailable" instead of a waitlist?
> 3. The ticket assumes 20 places per title, but nobody has set that number. What should it be, and is it the same for every title?
> 4. How many waitlists can one patron be on at the same time?
> 5. Holds expire after 3 days today. Should a waitlist offer use the same window or a shorter one?
> 6. If the patron doesn't borrow in time, does the offer go to the next person automatically?
>
> Non-blocking:
>
> 7. The prototype's button says "Join waitlist", while today's hold button says "Place hold". Which wording should we use? Unless someone says otherwise, I'll keep "Join waitlist".

What makes it work:

- The opening sentence is written for this list, not reused.
- Item 1 points to the ticket's open action point (notification channels) instead of repeating it.
- Facts the reader needs, such as the 3-day hold window, sit inside the questions that need them, not in a block above the list.
- Question 7 changes only wording and has a safe default, so it goes last under "Non-blocking:" and states that default.
- Headings would each sit over one or two questions, so there are none. Nothing follows the list.
