# Before and after

Each "after" keeps every fact from the "before".

## Investigation summary

Before:

> I've completed a thorough investigation into the issue you reported. After carefully reviewing the logs, it appears that the problem is related to the way the export job handles timeouts. Specifically, when the export job runs for longer than 30 seconds, the HTTP client times out. When this happens, the job doesn't properly handle the timeout exception. Instead of retrying, it marks the export as failed. This is why some users are seeing failed exports. It's worth noting that this only affects large exports, since smaller exports complete well within the 30-second limit. To fix this, we could either increase the timeout or add retry logic. I'd recommend adding retry logic, as this would make the system more resilient overall.

After:

> Exports that run longer than 30 seconds fail. The HTTP client times out, and the export job marks the export as failed instead of retrying. Small exports are not affected.
>
> Fix: add retry logic to the job. Raising the timeout also works, but large exports can still fail.

## Ticket context

Before:

> As part of our ongoing efforts to improve the user experience, we have identified that there is currently an issue where users are not able to easily find the settings page. Many users have reported that they find it confusing. The settings link is located in the footer, which is not where users expect it to be. Users expect it to be in the top navigation.

After:

> Users can't find Settings because the link is in the footer. They expect it in the top navigation.

## Chat answer

Question: "Does `array_map` keep array keys?"

Before:

> Great question! When it comes to `array_map` in PHP, the behaviour regarding keys depends on how you call it. If you pass a single array, the keys are preserved. However, if you pass more than one array, the keys are not preserved and the result is re-indexed. I hope this helps!

After:

> Yes, with 1 array. With 2 or more arrays, the result is re-indexed from 0.

## Bullet list

Before:

> - The cache is not invalidated when a user updates their profile.
> - Stale profile data is shown after an update.
> - Users see their old name until the cache expires.
> - The cache TTL is 1 hour.

After:

> - Profile updates don't clear the cache, so users see old data, such as their old name, for up to 1 hour (the cache TTL).

## When not to cut

Before:

> Run the migration before deploying. The new code reads the `status` column, which the migration adds. If you deploy first, every request to `/orders` returns 500 until the migration runs.

This is already tight. Each sentence carries a different fact: the order, the reason and the impact. Leave it.
