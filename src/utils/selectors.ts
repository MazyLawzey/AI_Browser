/**
 * Centralized DOM selectors for Moodle
 */
export const MoodleSelectors = {
  login: {
    usernameInput: 'input[name="username"]',
    passwordInput: 'input[name="password"]',
    submitButton: 'button[type="submit"], input[type="submit"]',
  },
  navigation: {
    courseLink: 'a[href*="course/view"]',
    dashboardLink: 'a[href*="/my/"]',
  },
  quiz: {
    quizLink: 'a[href*="quiz"], a[href*="mod/quiz"]',
    attemptButton: 'input[type="submit"][value*="Attempt"], a[href*="attempt.php"]',
    submitButton: 'input[type="submit"][value*="Submit"], button[type="submit"][class*="submit"]',
    finishButton: 'input[type="submit"][value*="Finish"], a[href*="closeattempt"]',
    confirmButton: 'input[type="submit"][value*="Submit"], button[class*="submit"]',
  },
  questions: {
    container: '.que, .qtext, div[id*="question"]',
    questionBox: '.que',
    questionText: '.qtext',
    radioInputs: 'input[type="radio"]',
    checkboxInputs: 'input[type="checkbox"]',
    textInputs: 'input[type="text"], textarea',
    labels: 'label',
  },
  question: {
    multichoice: 'multichoice',
    truefalse: 'truefalse',
    shortanswer: 'shortanswer',
    match: 'match',
  },
}

/**
 * Moodle URL paths
 */
export const MoodlePaths = {
  login: '/login/index.php',
  dashboard: '/my/',
  course: (id: string) => `/course/view.php?id=${id}`,
  quiz: (id: string) => `/mod/quiz/view.php?id=${id}`,
  attempt: (id: string) => `/mod/quiz/attempt.php?id=${id}`,
}
