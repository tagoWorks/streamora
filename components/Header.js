import React from 'react';
import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import { FaSearch, FaUser } from 'react-icons/fa';

const Header = () => {
  const { data: session } = useSession();

  return (
    <header className="header">
      <div className="header-left">
        <Link href="/">
          <a className="logo">Your Logo</a>
        </Link>
      </div>
      <div className="header-right">
        <div className="search-bar">
          <input type="text" placeholder="Search..." />
          <button type="submit">
            <FaSearch />
          </button>
        </div>
        <div className="account-section">
          {session ? (
            <>
              <span className="account-name">{session.user.name}</span>
              <button onClick={() => signOut()} className="sign-out-btn">
                Sign out
              </button>
            </>
          ) : (
            <>
              <button onClick={() => signIn()} className="sign-in-btn">
                Sign in
              </button>
              <Link href="/register">
                <a className="create-account-btn">Create Account</a>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;