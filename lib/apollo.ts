interface ApolloOrganization {
  name: string;
  website_url?: string;
}

interface RedactedPerson {
  id: string;
  first_name: string;
  title: string;
  organization?: ApolloOrganization;
}

interface EnrichedPerson {
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  organization_name?: string;
  title?: string;
}

export async function searchRealtors(location: string, page: number = 1, limit: number = 30): Promise<RedactedPerson[]> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    throw new Error('APOLLO_API_KEY environment variable is not set');
  }

  const response = await fetch('https://api.apollo.io/api/v1/mixed_people/api_search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify({
      person_titles: ['realtor', 'real estate agent', 'real estate broker'],
      person_locations: [location],
      page: page,
      per_page: Math.min(limit, 100), // Cap at 100 to prevent Apollo 422 "Per page not supported" error
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Apollo search failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const people: RedactedPerson[] = data.people || [];
  
  // Return up to the requested limit
  return people.slice(0, limit);
}


export async function enrichPerson(personId: string): Promise<EnrichedPerson | null> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    throw new Error('APOLLO_API_KEY environment variable is not set');
  }

  const response = await fetch('https://api.apollo.io/api/v1/people/match', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify({
      id: personId,
      reveal_personal_emails: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Apollo match failed for ${personId}:`, errorText);
    return null;
  }

  const data = await response.json();
  const person = data.person;
  
  if (!person || !person.email) {
    return null;
  }

  return {
    name: person.name,
    first_name: person.first_name,
    last_name: person.last_name,
    email: person.email,
    organization_name: person.organization?.name || 'Real Estate Agency',
    title: person.title,
  };
}

export async function findAndEnrichRealtors(location: string, page: number = 1, targetCount: number = 30): Promise<EnrichedPerson[]> {
  try {
    const redactedList = await searchRealtors(location, page, targetCount * 2); // Get double the candidates to ensure we hit targetCount after filtering out people without emails
    const enrichedList: EnrichedPerson[] = [];

    for (const redacted of redactedList) {
      if (enrichedList.length >= targetCount) {
        break;
      }
      
      const enriched = await enrichPerson(redacted.id);
      if (enriched && enriched.email) {
        enrichedList.push(enriched);
      }
      
      // Sleep briefly between requests to be nice to Apollo rate limits
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return enrichedList;
  } catch (error) {
    console.error('Error in findAndEnrichRealtors:', error);
    throw error;
  }
}

