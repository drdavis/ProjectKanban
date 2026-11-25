export function signupErrorMessage(status:number, detail:unknown):string {
 const code=detail&&typeof detail==='object'&&'code' in detail?String(detail.code):'';
 if(code==='INVITATION_INVALID')return 'This invitation is expired, revoked, or does not match your email. Open the latest invitation and enter the exact invited email address.';
 if(code==='USER_ALREADY_EXISTS'||code==='USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL')return 'An account already exists for this email. Use Set or reset password below, then sign in.';
 if(code==='PASSWORD_TOO_SHORT'||code==='PASSWORD_TOO_LONG')return 'The password does not meet the account requirements. Use a password between 12 and 128 characters.';
 if(code==='EMAIL_PASSWORD_SIGN_UP_DISABLED'||code==='SIGNUP_DISABLED'||code==='SIGN_UP_DISABLED')return 'Account creation is disabled by the authentication provider. Ask the board owner to check the signup configuration.';
 if(code==='INVALID_ORIGIN'||code==='INVALID_CALLBACK_URL')return 'The authentication provider rejected this app address. Ask the board owner to check the allowed domain and callback URL.';
 if(status===429)return 'Too many attempts. Wait a few minutes before trying again.';
 // Provider codes are bounded identifiers, never render raw provider messages or request data.
 const reference=/^[A-Za-z][A-Za-z0-9_]{0,79}$/.test(code)?' / '+code:'';
 return `Account creation failed (HTTP ${status}${reference}). Share this error with the board owner so they can check the invitation and authentication service.`;
}
