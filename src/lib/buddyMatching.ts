interface UserProfile {
  id: string;
  name: string;
  dateOfBirth?: string;
  diagnosisAge?: number;
  favoriteActivities?: string;
  about?: string;
  photo?: string;
  address?: {
    country?: string;
    state?: string;
    city?: string;
  };
}

interface MatchResult {
  user: UserProfile;
  score: number;
  reasons: string[];
}

/**
 * Calculate age from date of birth
 */
function calculateAge(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    return age - 1;
  }
  return age;
}

/**
 * Parse interests from favorite activities string
 */
function parseInterests(favoriteActivities?: string): string[] {
  if (!favoriteActivities) return [];
  return favoriteActivities
    .toLowerCase()
    .split(/[,;]/) // Split by comma or semicolon
    .map(activity => activity.trim())
    .filter(activity => activity.length > 0);
}

/**
 * Find shared interests between two users
 */
function findSharedInterests(interests1: string[], interests2: string[]): string[] {
  return interests1.filter(interest => 
    interests2.some(otherInterest => 
      interest.includes(otherInterest) || otherInterest.includes(interest)
    )
  );
}

/**
 * Calculate match score between two users (0-100)
 */
export function calculateMatchScore(user1: UserProfile, user2: UserProfile): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  
  // Age similarity (0-30 points)
  const age1 = user1.dateOfBirth ? calculateAge(user1.dateOfBirth) : null;
  const age2 = user2.dateOfBirth ? calculateAge(user2.dateOfBirth) : null;
  
  if (age1 !== null && age2 !== null) {
    const ageDiff = Math.abs(age1 - age2);
    if (ageDiff <= 2) {
      score += 30;
      reasons.push(`Very similar ages (${age1} and ${age2})`);
    } else if (ageDiff <= 5) {
      score += 20;
      reasons.push(`Similar ages (${age1} and ${age2})`);
    } else if (ageDiff <= 10) {
      score += 10;
      reasons.push(`Somewhat similar ages (${age1} and ${age2})`);
    }
  }
  
  // Diagnosis age similarity (0-40 points)
  if (user1.diagnosisAge !== undefined && user2.diagnosisAge !== undefined) {
    const diagnosisDiff = Math.abs(user1.diagnosisAge - user2.diagnosisAge);
    if (diagnosisDiff <= 1) {
      score += 40;
      reasons.push(`Very similar diagnosis ages (${user1.diagnosisAge} and ${user2.diagnosisAge})`);
    } else if (diagnosisDiff <= 3) {
      score += 25;
      reasons.push(`Similar diagnosis ages (${user1.diagnosisAge} and ${user2.diagnosisAge})`);
    } else if (diagnosisDiff <= 5) {
      score += 15;
      reasons.push(`Somewhat similar diagnosis ages (${user1.diagnosisAge} and ${user2.diagnosisAge})`);
    }
  }
  
  // Shared interests (0-30 points)
  const interests1 = parseInterests(user1.favoriteActivities);
  const interests2 = parseInterests(user2.favoriteActivities);
  const sharedInterests = findSharedInterests(interests1, interests2);
  
  if (sharedInterests.length >= 3) {
    score += 30;
    reasons.push(`Many shared interests: ${sharedInterests.slice(0, 3).join(', ')}`);
  } else if (sharedInterests.length >= 2) {
    score += 25;
    reasons.push(`Shared interests: ${sharedInterests.join(', ')}`);
  } else if (sharedInterests.length >= 1) {
    score += 15;
    reasons.push(`Shared interest: ${sharedInterests[0]}`);
  }
  
  // Location similarity bonus (0-10 points)
  if (user1.address?.country && user2.address?.country) {
    if (user1.address.country.toLowerCase() === user2.address.country.toLowerCase()) {
      score += 5;
      reasons.push(`Same country (${user1.address.country})`);
      
      if (user1.address.state && user2.address.state && 
          user1.address.state.toLowerCase() === user2.address.state.toLowerCase()) {
        score += 3;
        reasons.push(`Same state/region (${user1.address.state})`);
        
        if (user1.address.city && user2.address.city && 
            user1.address.city.toLowerCase() === user2.address.city.toLowerCase()) {
          score += 2;
          reasons.push(`Same city (${user1.address.city})`);
        }
      }
    }
  }
  
  return { score: Math.min(score, 100), reasons };
}

/**
 * Find potential buddy matches for a user
 */
export function findBuddyMatches(currentUser: UserProfile, allUsers: UserProfile[], minScore: number = 20): MatchResult[] {
  const matches: MatchResult[] = [];
  
  for (const user of allUsers) {
    // Skip self
    if (user.id === currentUser.id) continue;
    
    const { score, reasons } = calculateMatchScore(currentUser, user);
    
    if (score >= minScore) {
      matches.push({
        user,
        score,
        reasons
      });
    }
  }
  
  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score);
} 