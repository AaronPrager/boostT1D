-- Delete all but the most recently updated profile for each user
DELETE FROM "BasalProfile"
WHERE id IN (
    SELECT bp.id
    FROM "BasalProfile" bp
    INNER JOIN (
        SELECT "userId", MAX("updatedAt") as max_updated
        FROM "BasalProfile"
        GROUP BY "userId"
        HAVING COUNT(*) > 1
    ) duplicates ON bp."userId" = duplicates."userId"
    WHERE bp."updatedAt" < duplicates.max_updated
); 