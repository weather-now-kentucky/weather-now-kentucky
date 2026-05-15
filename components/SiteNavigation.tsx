"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

export type SiteNavItem = {
  href: string;
  label: string;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNavigation({ items }: { items: SiteNavItem[] }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.body.classList.add("mobile-menu-open");
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.classList.remove("mobile-menu-open");
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <>
      <button
        aria-controls="mobile-site-menu"
        aria-expanded={isOpen}
        aria-label="Open navigation menu"
        className="mobile-menu-button"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <Menu aria-hidden="true" size={22} />
        <span>Menu</span>
      </button>

      <div className="nav-wrap">
        <nav aria-label="Main navigation" className="nav">
          {items.map((item) => (
            <Link aria-current={isActivePath(pathname, item.href) ? "page" : undefined} href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </div>

      {isOpen ? <button aria-label="Close navigation menu" className="mobile-menu-overlay" onClick={() => setIsOpen(false)} type="button" /> : null}
      <aside
        aria-label="Mobile navigation menu"
        aria-modal="true"
        className={isOpen ? "mobile-drawer is-open" : "mobile-drawer"}
        id="mobile-site-menu"
        role="dialog"
      >
        <div className="mobile-drawer-header">
          <div>
            <span>Weather Now Kentucky</span>
            <strong>Menu</strong>
          </div>
          <button aria-label="Close navigation menu" onClick={() => setIsOpen(false)} type="button">
            <X aria-hidden="true" size={22} />
          </button>
        </div>
        <nav className="mobile-drawer-nav">
          {items.map((item) => (
            <Link
              aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
              href={item.href}
              key={item.href}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mobile-drawer-settings">
          <span>Display</span>
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}
