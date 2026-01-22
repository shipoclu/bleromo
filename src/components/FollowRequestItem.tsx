import React, { useMemo, useState } from 'react';
import { useSnapshot } from 'valtio';
import { appState } from '../store/appState';

interface CustomEmoji {
  shortcode: string;
  url: string;
  static_url?: string;
  visible_in_picker?: boolean;
}

interface Account {
  id: string;
  username: string;
  acct: string;
  display_name: string;
  avatar: string;
  url: string;
  emojis?: CustomEmoji[];
}

interface FollowRequestItemProps {
  account: Account;
  onApprove: (accountId: string) => Promise<void>;
  onDeny: (accountId: string) => Promise<void>;
  onUserClick?: (userId: string) => void;
  compact?: boolean;
}

const FollowRequestItem: React.FC<FollowRequestItemProps> = ({
  account,
  onApprove,
  onDeny,
  onUserClick,
  compact = false
}) => {
  const snap = useSnapshot(appState);
  const [isApproving, setIsApproving] = useState(false);
  const [isDenying, setIsDenying] = useState(false);

  const stripHtml = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  const processedDisplayName = useMemo(() => {
    if (!account.display_name && !account.username) return '';
    if (!account.emojis || account.emojis.length === 0) {
      return stripHtml(account.display_name || account.username);
    }

    let processed = stripHtml(account.display_name || account.username);
    account.emojis.forEach(emoji => {
      const emojiPattern = new RegExp(`:${emoji.shortcode}:`, 'g');
      const emojiImg = `<img src=\"${emoji.url}\" alt=\":${emoji.shortcode}:\" style=\"height: 1.2em !important; width: auto !important; vertical-align: middle !important; display: inline !important;\" />`;
      processed = processed.replace(emojiPattern, emojiImg);
    });

    return processed;
  }, [account.display_name, account.username, account.emojis]);

  const decision = snap.followRequestDecisions[account.id];

  const handleApprove = async () => {
    if (decision || isApproving || isDenying) return;
    setIsApproving(true);
    try {
      await onApprove(account.id);
      appState.followRequestDecisions[account.id] = 'approved';
    } catch (error) {
      console.error('Error approving follow request:', error);
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeny = async () => {
    if (decision || isApproving || isDenying) return;
    setIsDenying(true);
    try {
      await onDeny(account.id);
      appState.followRequestDecisions[account.id] = 'denied';
    } catch (error) {
      console.error('Error denying follow request:', error);
    } finally {
      setIsDenying(false);
    }
  };

  return (
    <div style={{
      padding: compact ? '6px' : '8px',
      border: '1px solid #808080',
      backgroundColor: '#ffffff',
      marginBottom: compact ? '4px' : '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontFamily: 'var(--win98-font)',
      fontSize: '12px'
    }}>
      {!compact && (
        <img
          src={account.avatar}
          alt="Avatar"
          style={{
            width: '40px',
            height: '40px',
            border: '1px solid #808080',
            cursor: onUserClick ? 'pointer' : 'default'
          }}
          onClick={() => onUserClick && onUserClick(account.id)}
        />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 'bold',
            cursor: onUserClick ? 'pointer' : 'default',
            color: onUserClick ? 'var(--win98-help-green)' : 'inherit',
            textDecoration: onUserClick ? 'underline' : 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          onClick={() => onUserClick && onUserClick(account.id)}
          dangerouslySetInnerHTML={{
            __html: processedDisplayName
          }}
        />
        <div
          style={{
            color: '#808080',
            fontSize: '11px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={`@${account.acct}`}
        >
          @{account.acct}
        </div>
        {account.url && (
          <a
            href={account.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '11px',
              color: '#0000ff',
              textDecoration: 'underline'
            }}
          >
            View profile
          </a>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {!decision && (
          <>
            <button
              onClick={handleApprove}
              disabled={isApproving || isDenying}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                border: '2px outset #c0c0c0',
                backgroundColor: '#c0c0c0',
                cursor: (isApproving || isDenying) ? 'default' : 'pointer',
                opacity: (isApproving || isDenying) ? 0.6 : 1,
                fontFamily: 'var(--win98-font)'
              }}
            >
              {isApproving ? 'Approving...' : 'Approve'}
            </button>
            <button
              onClick={handleDeny}
              disabled={isApproving || isDenying}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                border: '2px outset #c0c0c0',
                backgroundColor: '#c0c0c0',
                cursor: (isApproving || isDenying) ? 'default' : 'pointer',
                opacity: (isApproving || isDenying) ? 0.6 : 1,
                fontFamily: 'var(--win98-font)'
              }}
            >
              {isDenying ? 'Denying...' : 'Deny'}
            </button>
          </>
        )}

        {decision && (
          <span style={{
            fontSize: '11px',
            color: decision === 'approved' ? 'var(--win98-help-green)' : '#800000',
            fontWeight: 'bold'
          }}>
            {decision === 'approved' ? 'Approved' : 'Denied'}
          </span>
        )}
      </div>
    </div>
  );
};

export default React.memo(FollowRequestItem);
