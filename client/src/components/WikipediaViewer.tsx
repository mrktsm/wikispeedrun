import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef, useMemo } from "react";
import DOMPurify from "dompurify";
import "./WikipediaViewer.css";

interface WikiApiArticle {
  parse?: {
    title?: string;
    pageid?: number;
    text?: {
      "*"?: string;
    };
  };
}

const getArticleData = async (language: string, title: string) => {
  if (!title) return null;

  const resp = await fetch(
    `https://${language}.wikipedia.org/w/api.php?` +
      new URLSearchParams({
        page: title,
        origin: "*",
        action: "parse",
        format: "json",
        disableeditsection: "true",
        redirects: "true",
      }).toString()
  );
  return resp.json() as Promise<WikiApiArticle>;
};

interface WikipediaViewerProps {
  initialTitle?: string;
  hideControls?: boolean;
  onArticleNavigate?: (articleName: string) => void;
  onArticleLoaded?: () => void;
  endArticle?: string;
  onDestinationReached?: () => void;
  children?: React.ReactNode;
}

const WikipediaViewer = ({
  initialTitle = "React_(JavaScript_library)",
  hideControls = false,
  onArticleNavigate,
  onArticleLoaded,
  endArticle,
  onDestinationReached,
  children,
}: WikipediaViewerProps) => {
  const [articleTitle, setArticleTitle] = useState(initialTitle);
  const [language, setLanguage] = useState("en");
  const queryClient = useQueryClient();
  
  // Keep track of currently DISPLAYED article (separate from fetching state)
  const [displayedArticle, setDisplayedArticle] = useState<WikiApiArticle | null>(null);
  
  // Track hover state for preloading
  const hoverTimeoutRef = useRef<number | null>(null);
  const preloadedLinksRef = useRef<Set<string>>(new Set());

  const { data, isFetching, isError } = useQuery({
    queryKey: ["article", articleTitle, language],
    queryFn: () => getArticleData(language, articleTitle),
    enabled: Boolean(articleTitle),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // Cache articles for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
  
  // Update displayed article only when new data is ready
  useEffect(() => {
    if (data && !isFetching && data.parse?.text) {
      setDisplayedArticle(data);
    }
  }, [data, isFetching]);

  // Notify when article loads
  useEffect(() => {
    if (displayedArticle?.parse?.text && onArticleLoaded) {
      onArticleLoaded();
    }
  }, [displayedArticle, onArticleLoaded]);

  // Detect destination reached
  useEffect(() => {
    if (!endArticle || !data?.parse?.title || !onDestinationReached) return;
    const normalize = (t: string) => t.replace(/\s+/g, "_").toLowerCase();
    if (normalize(data.parse.title) === normalize(endArticle)) {
      onDestinationReached();
    }
  }, [data, endArticle, onDestinationReached]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setArticleTitle(e.target.value);
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value);
  };
  
  // Handle mouse movement for link preloading
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const link = target.closest("a");
    
    // Clear previous timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    if (!link) return;
    
    const href = link.getAttribute("href");
    if (!href || !href.startsWith("/wiki/")) return;
    
    const linkTitle = decodeURIComponent(href.replace("/wiki/", ""));
    
    // Skip special pages
    if (linkTitle.includes(":")) return;
    
    // Debounce hover events (only preload if hovering for 150ms)
    hoverTimeoutRef.current = setTimeout(() => {
      if (href && href.startsWith("/wiki/")) {
        const title = decodeURIComponent(href.replace("/wiki/", ""));
        
        // Skip special pages and already preloaded links
        if (!title.includes(":") && !preloadedLinksRef.current.has(title)) {
          console.log(`[Preload] Hover-prefetching: ${title}`);
          preloadedLinksRef.current.add(title);
          
          // Prefetch the article
          queryClient.prefetchQuery({
            queryKey: ["article", title, language],
            queryFn: () => getArticleData(language, title),
            staleTime: 5 * 60 * 1000,
          });
        }
      }
    }, 150);
  };
  
  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);
  
  // Performance: Lazy load images and async decoding
  useEffect(() => {
    if (!displayedArticle) return;
    
    const images = document.querySelectorAll('.wiki-content img');
    images.forEach((img) => {
      img.setAttribute('loading', 'lazy');
      img.setAttribute('decoding', 'async');
    });
  }, [displayedArticle]);
  
  // Performance: Preload first 5 article links immediately (high probability of being clicked)
  useEffect(() => {
    if (!displayedArticle) return;
    
    // Wait a bit for DOM to settle, then preload top links
    const timeoutId = setTimeout(() => {
      const links = document.querySelectorAll('.wiki-content a[href^="/wiki/"]');
      const topLinks = Array.from(links).slice(0, 5);
      
      topLinks.forEach((link) => {
        const href = link.getAttribute('href');
        if (href) {
          const title = decodeURIComponent(href.replace('/wiki/', ''));
          if (!title.includes(':') && !preloadedLinksRef.current.has(title)) {
            preloadedLinksRef.current.add(title);
            console.log(`[Preload] Auto-prefetching top link: ${title}`);
            queryClient.prefetchQuery({
              queryKey: ['article', title, language],
              queryFn: () => getArticleData(language, title),
              staleTime: 5 * 60 * 1000,
            });
          }
        }
      });
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [displayedArticle, language, queryClient]);
  
  // Performance: Memoize DOMPurify sanitization (expensive operation)
  const sanitizedHTML = useMemo(() => {
    if (!displayedArticle?.parse?.text?.["*"]) return '';
    return DOMPurify.sanitize(displayedArticle.parse.text["*"]);
  }, [displayedArticle?.parse?.text]);

  const handleArticleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const link = target.closest("a");

    if (link) {
      const href = link.getAttribute("href");

      // Check if it's a Wikipedia article link (starts with /wiki/)
      if (href && href.startsWith("/wiki/")) {
        e.preventDefault();

        // Extract article title from /wiki/Article_Title
        const newTitle = decodeURIComponent(href.replace("/wiki/", ""));

        // Skip special pages, files, categories, etc.
        if (!newTitle.includes(":")) {
          setArticleTitle(newTitle);
          // Notify parent component about navigation
          if (onArticleNavigate) {
            onArticleNavigate(newTitle);
          }
          // Scroll to the very top when navigating to new article
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        }
      } else {
        // Prevent external links from navigating away
        e.preventDefault();
      }
    }
  };

  if (isError) {
    return (
      <div className="wikipedia-viewer">
        {!hideControls && (
          <div className="wiki-controls">
            <input
              type="text"
              value={articleTitle}
              onChange={handleTitleChange}
              placeholder="Enter Wikipedia article title"
              className="wiki-input"
            />
            <select
              value={language}
              onChange={handleLanguageChange}
              className="wiki-select"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>
        )}
        <div className="wiki-error">
          Error loading article. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="wikipedia-viewer">
      {!hideControls && (
        <div className="wiki-controls">
          <input
            type="text"
            value={articleTitle}
            onChange={handleTitleChange}
            placeholder="Enter Wikipedia article title"
            className="wiki-input"
          />
          <select
            value={language}
            onChange={handleLanguageChange}
            className="wiki-select"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>
        </div>
      )}

      {sanitizedHTML && (
        <div className="wiki-article">
          <h1 className="wiki-title">{displayedArticle?.parse?.title}</h1>
          <div
            className="wiki-content"
            onClick={handleArticleClick}
            onMouseMove={handleMouseMove}
            dangerouslySetInnerHTML={{
              __html: sanitizedHTML,
            }}
          />
        </div>
      )}
      {children}
    </div>
  );
};

export default WikipediaViewer;
