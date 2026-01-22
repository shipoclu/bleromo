import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSnapshot } from 'valtio';
import { appState } from '../store/appState';
import ParsedContent from './ParsedContent';
import type { Poll } from '../types/poll';

interface PollComponentProps {
  poll?: Poll | null;
  pollId?: string;
}

const PollComponent: React.FC<PollComponentProps> = ({ poll, pollId }) => {
  const snap = useSnapshot(appState);
  const [localPoll, setLocalPoll] = useState<Poll | null>(poll ?? null);
  const [selected, setSelected] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (poll) {
      setLocalPoll(poll);
    }
  }, [poll]);

  const resolvedPollId = localPoll?.id || pollId;

  const normalizeBoolean = useCallback((value: unknown) => {
    if (value === true) return true;
    if (value === false) return false;
    if (typeof value === 'string') {
      const lowered = value.trim().toLowerCase();
      if (lowered === 'true') return true;
      if (lowered === 'false') return false;
    }
    if (typeof value === 'number') {
      return value !== 0;
    }
    return false;
  }, []);

  const pollVoted = useMemo(() => {
    if (!localPoll) return false;
    if (normalizeBoolean(localPoll.voted)) return true;
    if (Array.isArray(localPoll.own_votes) && localPoll.own_votes.length > 0) return true;
    return false;
  }, [localPoll, normalizeBoolean]);

  const pollExpired = useMemo(() => {
    if (!localPoll) return false;
    if (normalizeBoolean(localPoll.expired)) return true;
    return false;
  }, [localPoll, normalizeBoolean]);

  const showResults = useMemo(() => {
    if (!localPoll) return false;
    return pollVoted || pollExpired;
  }, [localPoll, pollExpired, pollVoted]);

  const totalVotes = localPoll?.votes_count ?? 0;

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  const escapeHtml = useCallback((value: string) => {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }, []);

  const fetchPoll = useCallback(async (id: string) => {
    if (!snap.serverUrl) return;
    const headers: Record<string, string> = {};
    if (snap.accessToken) {
      headers.Authorization = `Bearer ${snap.accessToken}`;
    }

    const response = await fetch(`${snap.serverUrl}/api/v1/polls/${id}`, {
      headers: headers
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Failed to fetch poll: ${response.status}`);
    }
    const updatedPoll = await response.json();
    setLocalPoll(updatedPoll);
  }, [snap.accessToken, snap.serverUrl]);

  useEffect(() => {
    if (!localPoll && pollId) {
      setIsRefreshing(true);
      setError(null);
      fetchPoll(pollId)
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to fetch poll');
        })
        .finally(() => setIsRefreshing(false));
    }
  }, [fetchPoll, localPoll, pollId]);

  const toggleOption = (index: number) => {
    if (!localPoll || showResults || pollExpired) return;
    setSelected((prev) => {
      if (localPoll.multiple) {
        return prev.includes(index) ? prev.filter((value) => value !== index) : [...prev, index];
      }
      return [index];
    });
  };

  const handleVote = async () => {
    if (!localPoll || selected.length === 0) return;
    if (!snap.accessToken || !snap.serverUrl) {
      setError('Not authenticated');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`${snap.serverUrl}/api/v1/polls/${localPoll.id}/votes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${snap.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ choices: selected })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to vote: ${response.status}`);
      }

      const updatedPoll = await response.json();
      setLocalPoll(updatedPoll);
      setSelected([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to vote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    if (!resolvedPollId) return;
    setIsRefreshing(true);
    setError(null);
    try {
      await fetchPoll(resolvedPollId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh poll');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!localPoll) return null;

  const canVote = !pollExpired && !pollVoted && selected.length > 0 && !isSubmitting;
  const showRefresh = !pollExpired && pollVoted;

  return (
    <div
      style={{
        marginBottom: '8px',
        border: '1px solid #808080',
        backgroundColor: '#f8f8f8',
        padding: '6px'
      }}
    >
      {!showResults && localPoll.multiple && (
        <div style={{ fontSize: '11px', color: '#808080', marginBottom: '6px' }}>
          Choose as many as you like.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {localPoll.options.map((option, index) => {
          const percent = totalVotes > 0 ? Math.round((option.votes_count / totalVotes) * 100) : 0;
          const isOwnVote = localPoll.own_votes?.includes(index);
          const inputId = `poll-${localPoll.id}-${index}`;

          return (
            <div key={`${localPoll.id}-${index}`} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {showResults ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '11px' }}>
                  <span style={{ fontWeight: isOwnVote ? 'bold' : 'normal' }}>
                    <ParsedContent html={escapeHtml(option.title)} emojis={localPoll.emojis} />
                  </span>
                  <span style={{ color: '#404040', whiteSpace: 'nowrap' }}>
                    {option.votes_count} ({percent}%)
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                  <input
                    id={inputId}
                    type={localPoll.multiple ? 'checkbox' : 'radio'}
                    name={`poll-${localPoll.id}`}
                    checked={selected.includes(index)}
                    onChange={() => toggleOption(index)}
                  />
                  <label htmlFor={inputId} style={{ cursor: 'pointer' }}>
                    <ParsedContent html={escapeHtml(option.title)} emojis={localPoll.emojis} />
                  </label>
                </div>
              )}

              {showResults && (
                <div style={{ height: '6px', backgroundColor: '#e0e0e0', border: '1px inset #c0c0c0' }}>
                  <div
                    style={{
                      width: `${percent}%`,
                      height: '100%',
                      backgroundColor: '#000080'
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '6px', fontSize: '11px', color: '#808080' }}>
        {localPoll.expired ? 'Closed' : localPoll.expires_at ? `Ends ${formatDate(localPoll.expires_at)}` : 'Ongoing'}
        {` • ${localPoll.votes_count} votes`}
      </div>

      {error && (
        <div style={{ color: '#800000', fontSize: '11px', marginTop: '4px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
        {!pollExpired && !pollVoted && (
          <button
            onClick={handleVote}
            disabled={!canVote}
            style={{
              padding: '2px 8px',
              fontSize: '11px',
              border: '2px outset #c0c0c0',
              backgroundColor: '#c0c0c0',
              cursor: canVote ? 'pointer' : 'default',
              opacity: canVote ? 1 : 0.6
            }}
          >
            {isSubmitting ? 'Voting...' : 'Vote'}
          </button>
        )}

        {showRefresh && (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{
              padding: '2px 8px',
              fontSize: '11px',
              border: '2px outset #c0c0c0',
              backgroundColor: '#c0c0c0',
              cursor: isRefreshing ? 'default' : 'pointer',
              opacity: isRefreshing ? 0.6 : 1
            }}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        )}
      </div>
    </div>
  );
};

export default PollComponent;
