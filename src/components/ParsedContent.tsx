import React, { useMemo } from 'react';

interface Mention {
  id: string;
  username: string;
  acct: string;
  url: string;
}

interface CustomEmoji {
  shortcode: string;
  url: string;
  static_url?: string;
  visible_in_picker?: boolean;
}

interface ParsedContentProps {
  html: string;
  mentions?: Mention[];
  emojis?: CustomEmoji[];
  onUserClick?: (userId: string) => void;
  onYouTubeClick?: (videoId: string, videoUrl: string) => void;
}

const BLOCKED_TAGS = new Set(['script', 'iframe', 'object', 'embed', 'style']);

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildEmojiRegex = (emojis: CustomEmoji[]) => {
  if (emojis.length === 0) return null;
  const codes = emojis.map(emoji => escapeRegex(emoji.shortcode)).join('|');
  if (!codes) return null;
  return new RegExp(`:(${codes}):`, 'g');
};

const extractYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
};

const sanitizeHref = (href: string | null) => {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:')) return null;
  return trimmed;
};

const ParsedContent: React.FC<ParsedContentProps> = ({ html, mentions, emojis, onUserClick, onYouTubeClick }) => {
  const content = useMemo(() => {
    if (!html) return null;

    const normalizedHtml = html.replace(/<br\s*\/?>/gi, '\n');
    const parser = new DOMParser();
    const doc = parser.parseFromString(normalizedHtml, 'text/html');
    const emojiMap = new Map((emojis || []).map(emoji => [emoji.shortcode, emoji.url]));
    const emojiRegex = buildEmojiRegex(emojis || []);

    const renderEmoji = (text: string, keyPrefix: string) => {
      if (!emojiRegex || !emojiMap.size) return text;
      emojiRegex.lastIndex = 0;
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      let partIndex = 0;

      while ((match = emojiRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push(text.slice(lastIndex, match.index));
        }
        const shortcode = match[1];
        const emojiUrl = emojiMap.get(shortcode);
        if (emojiUrl) {
          parts.push(
            <img
              key={`${keyPrefix}-emoji-${partIndex}`}
              src={emojiUrl}
              alt={`:${shortcode}:`}
              style={{
                height: '1.2em',
                width: 'auto',
                verticalAlign: 'middle',
                display: 'inline'
              }}
            />
          );
        } else {
          parts.push(match[0]);
        }
        lastIndex = match.index + match[0].length;
        partIndex += 1;
      }

      if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
      }

      return parts.length === 1 ? parts[0] : parts;
    };

    const renderText = (text: string, keyPrefix: string) => {
      const lines = text.split(/\r?\n/);
      if (lines.length === 1) {
        return renderEmoji(text, keyPrefix);
      }
      const parts: React.ReactNode[] = [];
      lines.forEach((line, index) => {
        const renderedLine = renderEmoji(line, `${keyPrefix}-line-${index}`);
        if (Array.isArray(renderedLine)) {
          parts.push(...renderedLine);
        } else if (renderedLine !== null && renderedLine !== undefined) {
          parts.push(renderedLine);
        }
        if (index < lines.length - 1) {
          parts.push(<br key={`${keyPrefix}-br-${index}`} />);
        }
      });
      return parts;
    };

    const renderChildren = (nodes: ChildNode[], keyPrefix: string) => {
      return nodes.map((child, index) => renderNode(child, `${keyPrefix}-${index}`)).filter(Boolean);
    };

    const renderNode = (node: ChildNode, key: string): React.ReactNode => {
      if (node.nodeType === Node.TEXT_NODE) {
        return renderText(node.textContent || '', key);
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return null;

      const element = node as Element;
      const tag = element.tagName.toLowerCase();

      if (BLOCKED_TAGS.has(tag)) return null;

      if (tag === 'br') {
        return <br key={key} />;
      }

      if (tag === 'a') {
        const href = sanitizeHref(element.getAttribute('href'));
        const classList = element.getAttribute('class')?.split(' ') || [];
        const rel = element.getAttribute('rel') || '';
        const children = renderChildren(Array.from(element.childNodes), key);
        const textContent = element.textContent || '';

        if (href && classList.includes('mention')) {
          const mention = mentions?.find(item => item.url === href) ||
            mentions?.find(item => textContent.includes(item.acct) || textContent.includes(item.username));

          if (mention) {
            return (
              <span
                key={key}
                style={{
                  color: 'var(--win98-help-green)',
                  textDecoration: 'none',
                  cursor: onUserClick ? 'pointer' : 'default'
                }}
                onClick={() => onUserClick && onUserClick(mention.id)}
                title={`View profile of @${mention.acct}`}
              >
                {textContent}
              </span>
            );
          }

          return (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="nofollow noopener noreferrer"
              style={{ color: 'var(--win98-help-green)', textDecoration: 'none', cursor: 'pointer', fontStyle: 'italic' }}
              title={`Open profile: ${textContent || href}`}
            >
              {children.length ? children : textContent}
            </a>
          );
        }

        if (classList.includes('hashtag') || rel.includes('tag')) {
          return (
            <a
              key={key}
              href={href || undefined}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--win98-help-green)', textDecoration: 'none', cursor: 'pointer' }}
            >
              {children}
            </a>
          );
        }

        if (href && onYouTubeClick) {
          const videoId = extractYouTubeVideoId(href);
          if (videoId) {
            return (
              <span
                key={key}
                style={{ color: '#ff0000', textDecoration: 'underline', cursor: 'pointer' }}
                onClick={() => onYouTubeClick(videoId, href)}
                title={`Open YouTube video: ${href}`}
              >
                {textContent || href}
              </span>
            );
          }
        }

        return (
          <a
            key={key}
            href={href || undefined}
            target="_blank"
            rel="nofollow noopener noreferrer"
            style={{ color: '#0000ff', textDecoration: 'underline' }}
          >
            {children}
          </a>
        );
      }

      if (tag === 'img') {
        const src = sanitizeHref(element.getAttribute('src'));
        if (!src) return null;
        const alt = element.getAttribute('alt') || '';
        const title = element.getAttribute('title') || undefined;
        const classList = element.getAttribute('class')?.split(' ') || [];
        const isEmoji = classList.includes('emoji') || classList.includes('emojione') || classList.includes('custom-emoji');
        const style = isEmoji
          ? { height: '1.2em', width: 'auto', verticalAlign: 'middle', display: 'inline' }
          : { maxWidth: '100%', height: 'auto' };

        return (
          <img
            key={key}
            src={src}
            alt={alt}
            title={title}
            style={style}
          />
        );
      }

      const children = renderChildren(Array.from(element.childNodes), key);
      const props: Record<string, unknown> = { key };

      if (tag === 'p') {
        props.style = { margin: '0 0 8px 0' };
      }

      return React.createElement(tag, props, children.length ? children : null);
    };

    return renderChildren(Array.from(doc.body.childNodes), 'root');
  }, [html, mentions, emojis, onUserClick, onYouTubeClick]);

  return <>{content}</>;
};

export default React.memo(ParsedContent);
