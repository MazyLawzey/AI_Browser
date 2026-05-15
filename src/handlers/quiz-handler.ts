import { IWebViewExecutor, IQuizHandler, IAIService, ILogger } from '../core/interfaces'
import { MoodleSelectors } from '../utils/selectors'
import { Question, QuestionType } from '../types'
import { MoodleError } from '../core/errors'
import { eventBus, AppEvents } from '../events/event-bus'

/**
 * Handles quiz navigation and question answering
 */
export class QuizHandler implements IQuizHandler {
  constructor(
    private executor: IWebViewExecutor,
    private aiService: IAIService,
    private logger: ILogger
  ) {}

  async navigateToQuiz(baseUrl: string): Promise<void> {
    this.logger.info('Navigating to quiz')
    eventBus.publish(AppEvents.QUIZ_FOUND)

    try {
      const quizFound = await this.executor.exec<boolean>(`
        const links = document.querySelectorAll(${JSON.stringify(MoodleSelectors.quiz.quizLink)});
        if (links.length > 0) {
          links[0].click();
          return true;
        }
        return false;
      `)

      if (quizFound) {
        await this.executor.waitForPageLoad()
        this.logger.info('Found and clicked quiz link')
        return
      }

      this.logger.info('Quiz not on current page, navigating via dashboard')
      await this.executor.click(MoodleSelectors.navigation.courseLink)
      await this.executor.waitForPageLoad()
      await this.executor.click(MoodleSelectors.quiz.quizLink)
      await this.executor.waitForPageLoad()

      this.logger.info('Quiz navigation complete')
    } catch (error) {
      this.logger.error('Error navigating to quiz', error)
      throw error
    }
  }

  async startAttempt(): Promise<void> {
    this.logger.info('Starting quiz attempt')
    eventBus.publish(AppEvents.QUIZ_STARTED)

    try {
      const hasAttemptBtn = await this.executor.elementExists(MoodleSelectors.quiz.attemptButton)

      if (hasAttemptBtn) {
        await this.executor.click(MoodleSelectors.quiz.attemptButton)
        await this.executor.waitForPageLoad()
      }

      this.logger.info('Quiz attempt started')
    } catch (error) {
      this.logger.error('Error starting quiz attempt', error)
      throw error
    }
  }

  async getQuestions(): Promise<Question[]> {
    this.logger.info('Fetching quiz questions')

    try {
      const questions = await this.executor.exec<Array<{ id: string; text: string; type: string }>>(`
        const questions = [];
        document.querySelectorAll(${JSON.stringify(MoodleSelectors.questions.questionBox)}).forEach((q, i) => {
          const text = q.querySelector(${JSON.stringify(MoodleSelectors.questions.questionText)})?.textContent?.trim() || 'No text';
          const id = q.id || 'q-' + i;
          let type = 'unknown';
          
          if (q.classList.contains(${JSON.stringify(MoodleSelectors.question.multichoice)})) type = 'multichoice';
          else if (q.classList.contains(${JSON.stringify(MoodleSelectors.question.truefalse)})) type = 'truefalse';
          else if (q.classList.contains(${JSON.stringify(MoodleSelectors.question.shortanswer)})) type = 'shortanswer';
          else if (q.classList.contains(${JSON.stringify(MoodleSelectors.question.match)})) type = 'match';
          
          questions.push({ id, text, type });
        });
        return questions;
      `)

      if (!questions || questions.length === 0) {
        throw new MoodleError('No questions found on quiz page')
      }

      this.logger.info('Questions fetched', { count: questions.length })
      eventBus.publish(AppEvents.QUESTIONS_LOADED, { count: questions.length })

      return questions.map((q) => ({
        ...q,
        type: q.type as QuestionType,
      }))
    } catch (error) {
      this.logger.error('Error fetching questions', error)
      throw error
    }
  }

  async answerQuestion(question: Question): Promise<void> {
    this.logger.debug('Answering question', { id: question.id, type: question.type })

    try {
      const prompt = `Вопрос типа "${question.type}" из теста Moodle: "${question.text}". Дай только ответ, без объяснений.`

      let answer = ''
      try {
        answer = await this.aiService.generateResponse(prompt)
      } catch (error) {
        this.logger.warn('Failed to get AI response, using fallback', { id: question.id })
        answer = 'не знаю'
      }

      await this.fillAnswer(question, answer)
      eventBus.publish(AppEvents.QUESTION_ANSWERED, { id: question.id })
    } catch (error) {
      this.logger.error('Error answering question', error)
      throw error
    }
  }

  async submitQuiz(): Promise<void> {
    this.logger.info('Submitting quiz')

    try {
      await this.executor.click(MoodleSelectors.quiz.submitButton)
      await this.executor.waitForPageLoad()
      await this.executor.click(MoodleSelectors.quiz.confirmButton)
      await this.executor.waitForPageLoad()

      this.logger.info('Quiz submitted successfully')
      eventBus.publish(AppEvents.QUIZ_COMPLETED)
    } catch (error) {
      this.logger.error('Error submitting quiz', error)
      throw error
    }
  }

  private async fillAnswer(question: Question, answer: string): Promise<void> {
    const escapedAnswer = JSON.stringify(answer.trim())
    const questionId = JSON.stringify(question.id)

    switch (question.type) {
      case 'multichoice':
        await this.fillMultiChoice(questionId, escapedAnswer)
        break
      case 'truefalse':
        await this.fillTrueFalse(questionId, escapedAnswer)
        break
      case 'shortanswer':
      case 'match':
      case 'unknown':
      default:
        await this.fillShortAnswer(questionId, escapedAnswer)
        break
    }
  }

  private async fillMultiChoice(questionId: string, escapedAnswer: string): Promise<void> {
    await this.executor.exec(`
      const questionEl = document.getElementById(${questionId});
      if (!questionEl) return;
      const options = questionEl.querySelectorAll(${JSON.stringify(MoodleSelectors.questions.radioInputs)});
      const labels = questionEl.querySelectorAll(${JSON.stringify(MoodleSelectors.questions.labels)});
      let bestIdx = -1;
      labels.forEach((l, i) => {
        const txt = l.textContent?.toLowerCase() || '';
        const ans = ${escapedAnswer}.toLowerCase();
        if (txt.includes(ans) || ans.includes(txt)) bestIdx = i;
      });
      if (bestIdx >= 0 && options[bestIdx]) options[bestIdx].click();
    `)
  }

  private async fillTrueFalse(questionId: string, escapedAnswer: string): Promise<void> {
    await this.executor.exec(`
      const questionEl = document.getElementById(${questionId});
      if (!questionEl) return;
      const radios = questionEl.querySelectorAll(${JSON.stringify(MoodleSelectors.questions.radioInputs)});
      const val = ${escapedAnswer}.toLowerCase();
      if (val.includes('true') || val.includes('верно') || val.includes('прав')) {
        radios[0]?.click();
      } else {
        radios[1]?.click();
      }
    `)
  }

  private async fillShortAnswer(questionId: string, escapedAnswer: string): Promise<void> {
    await this.executor.exec(`
      const questionEl = document.getElementById(${questionId});
      if (!questionEl) return;
      const input = questionEl.querySelector(${JSON.stringify(MoodleSelectors.questions.textInputs)});
      if (input) {
        input.value = ${escapedAnswer};
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `)
  }
}
