export const authI18n = {
  ja: {
    title: 'ログイン',
    // 未ログイン時
    introTitle: 'Moodleアカウントでログイン',
    introMessage:
      '大学のMoodleアカウントでログインすると、課題の締切や提出状況をアプリで確認できます。',
    tokenNote: 'ログイン情報(トークン)はこの端末内にのみ安全に保存され、外部には送信されません。',
    loginButton: 'Moodleでログイン',
    checkingSession: 'ログイン状態を確認しています…',
    // ログイン済み
    loggedInTitle: 'ログイン中',
    usernameLabel: 'ユーザー名',
    siteLabel: 'サイト',
    accountSection: 'アカウント',
    relogin: '再ログイン',
    logoutConfirmTitle: 'ログアウトしますか?',
    logoutConfirmMessage: '保存されたログイン情報(トークン)をこの端末から削除します。',
    // 再ログイン推奨
    reloginTitle: '再ログインのおすすめ',
    reloginMessage:
      '4月/9月はパスワード更新時期のため、Moodleへの再ログインをおすすめします。',
    // web
    webNotSupported: 'ログインはモバイルアプリ版でのみ利用できます',
    webNotSupportedMessage: 'MoodleログインはiOS / Androidアプリでご利用いただけます。',
    // エラー
    errorTitle: 'ログインに失敗しました',
    errorBrowser: 'ログイン画面を開けませんでした。もう一度お試しください。',
    errorParseToken: '認証トークンを取得できませんでした。もう一度お試しください。',
    errorInvalidToken: 'トークンが無効です。お手数ですが、もう一度ログインしてください。',
    errorApi: 'Moodleとの通信でエラーが発生しました。時間をおいて再度お試しください。',
    errorNetwork: 'ネットワークに接続できませんでした。通信環境を確認して再度お試しください。',
  },
  en: {
    title: 'Log in',
    // Logged out
    introTitle: 'Log in with your Moodle account',
    introMessage:
      'Log in with your university Moodle account to see assignment deadlines and submission status in the app.',
    tokenNote:
      'Your login credential (token) is stored securely on this device only and is never sent anywhere else.',
    loginButton: 'Log in with Moodle',
    checkingSession: 'Checking your session…',
    // Logged in
    loggedInTitle: 'Logged in',
    usernameLabel: 'Username',
    siteLabel: 'Site',
    accountSection: 'Account',
    relogin: 'Log in again',
    logoutConfirmTitle: 'Log out?',
    logoutConfirmMessage: 'The saved login token will be removed from this device.',
    // Re-login suggestion
    reloginTitle: 'Re-login recommended',
    reloginMessage:
      'April and September are password update periods, so we recommend logging in to Moodle again.',
    // Web
    webNotSupported: 'Login is only available in the mobile app',
    webNotSupportedMessage: 'Moodle login is available in the iOS / Android app.',
    // Errors
    errorTitle: 'Login failed',
    errorBrowser: 'Could not open the login page. Please try again.',
    errorParseToken: 'Could not retrieve the authentication token. Please try again.',
    errorInvalidToken: 'The token is invalid. Please log in again.',
    errorApi: 'An error occurred while communicating with Moodle. Please try again later.',
    errorNetwork: 'Could not connect to the network. Please check your connection and try again.',
  },
} as const;
