export const getGlucoseStatus = (glucose: number, lowGlucose: number, highGlucose: number) => {
  if (glucose < lowGlucose) return { color: 'bg-red-100 text-red-800', status: 'Low' };
  if (glucose > highGlucose) return { color: 'bg-yellow-100 text-yellow-800', status: 'High' };
  return { color: 'bg-green-100 text-green-800', status: 'In Range' };
};

export const getDirectionIcon = (direction: string | null) => {
  switch (direction) {
    case 'NONE': return '⟷';
    case 'DoubleUp': return '⇈';
    case 'SingleUp': return '↑';
    case 'FortyFiveUp': return '↗';
    case 'Flat': return '→';
    case 'FortyFiveDown': return '↘';
    case 'SingleDown': return '↓';
    case 'DoubleDown': return '⇊';
    case 'NOT COMPUTABLE': return '-';
    case 'RATE OUT OF RANGE': return '⚠️';
    case 'Slight Rise': return '↗';
    case 'Slight Fall': return '↘';
    case 'Rise': return '↑';
    case 'Fall': return '↓';
    case 'Rapid Rise': return '⇈';
    case 'Rapid Fall': return '⇊';
    default: return '→';
  }
};

export const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'improving': return '📈';
    case 'declining': return '📉';
    default: return '➡️';
  }
};

export const formatTime = (dateInput: string | number) => {
  // Handle both string and number (timestamp) inputs
  const date = typeof dateInput === 'number' ? new Date(dateInput) : new Date(dateInput);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};


export const getVariabilityColor = (variability: number) => {
  if (variability < 20) return 'text-green-600';
  if (variability < 30) return 'text-yellow-600';
  return 'text-red-600';
};

export const formatDate = (date: Date) => {
  return date.toISOString().slice(0, 10);
};

export const formatRelativeTime = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
};
