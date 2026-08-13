import {
  inject,
} from '@angular/core';

import {
  CanActivateFn,
  Router,
} from '@angular/router';

import {
  AuthService,
} from '../services/auth.service';

import {
  TestRepositoryService,
} from '../services/test-repository.service';

export const testAttemptGuard:
  CanActivateFn =
  async (
    route,
  ) => {
    const auth =
      inject(AuthService);

    const router =
      inject(Router);

    const testRepository =
      inject(
        TestRepositoryService,
      );

    try {
      await auth
        .waitUntilInitialized();

      const user =
        auth.user();

      if (!user) {
        return router.createUrlTree(
          [
            '/teste/dados',
          ],
        );
      }

      const attemptId =
        route.queryParamMap
          .get('attemptId');

      const testId =
        route.queryParamMap
          .get('testId');

      if (
        !attemptId ||
        !testId
      ) {
        return router.createUrlTree(
          [
            '/teste/dados',
          ],
        );
      }

      const attempt =
        await testRepository
          .getAttemptForStudent(
            attemptId,
            user.id,
          );

      if (!attempt) {
        return router.createUrlTree(
          [
            '/teste/dados',
          ],
        );
      }

      /*
       * Nunca confiamos no testId
       * recebido pela URL.
       */
      if (
        attempt.testId !==
        testId
      ) {
        return router.createUrlTree(
          [
            '/teste/perguntas',
          ],
          {
            queryParams: {
              testId:
                attempt.testId,

              attemptId:
                attempt.id,
            },
          },
        );
      }

      const requestedPath =
        route.routeConfig?.path;

      /*
       * =====================================================
       * Tentativa já enviada
       * =====================================================
       *
       * Etapas anteriores deixam de ser acessíveis.
       *
       * /teste/processando continua permitido porque
       * finalize_test_attempt() é idempotente.
       */
      if (
        attempt.status ===
          'submitted' ||
        attempt.status ===
          'under_review' ||
        attempt.status ===
          'completed'
      ) {
        if (
          requestedPath ===
          'teste/processando'
        ) {
          return true;
        }

        return router.createUrlTree(
          [
            '/teste/processando',
          ],
          {
            queryParams: {
              testId:
                attempt.testId,

              attemptId:
                attempt.id,
            },
          },
        );
      }

      /*
       * Só in_progress pode acessar
       * as etapas respondíveis.
       */
      if (
        attempt.status !==
          'in_progress' ||
        attempt.submittedAt !==
          null ||
        attempt.completedAt !==
          null
      ) {
        return router.createUrlTree(
          [
            '/teste',
          ],
        );
      }

      /*
       * =====================================================
       * Grammar
       * =====================================================
       */

      if (
        requestedPath ===
        'teste/perguntas'
      ) {
        return true;
      }

      /*
       * Listening, Speaking e Processing
       * dependem do progresso objetivo.
       */
      const objectiveAnswers =
        await testRepository
          .countSavedObjectiveAnswers(
            attempt.id,
          );

      /*
       * =====================================================
       * Listening
       * =====================================================
       */

      if (
        requestedPath ===
        'teste/listening'
      ) {
        if (
          objectiveAnswers < 20
        ) {
          return router.createUrlTree(
            [
              '/teste/perguntas',
            ],
            {
              queryParams: {
                testId:
                  attempt.testId,

                attemptId:
                  attempt.id,
              },
            },
          );
        }

        return true;
      }

      /*
       * =====================================================
       * Speaking
       * =====================================================
       */

      if (
        requestedPath ===
        'teste/speaking'
      ) {
        if (
          objectiveAnswers >= 23
        ) {
          return true;
        }

        if (
          objectiveAnswers >= 20
        ) {
          return router.createUrlTree(
            [
              '/teste/listening',
            ],
            {
              queryParams: {
                testId:
                  attempt.testId,

                attemptId:
                  attempt.id,
              },
            },
          );
        }

        return router.createUrlTree(
          [
            '/teste/perguntas',
          ],
          {
            queryParams: {
              testId:
                attempt.testId,

              attemptId:
                attempt.id,
            },
          },
        );
      }

      /*
       * =====================================================
       * Processing
       * =====================================================
       *
       * Só entra aqui se:
       *
       * 1. todas as respostas objetivas existem;
       * 2. todas as questões Speaking possuem gravação.
       */

      if (
        requestedPath ===
        'teste/processando'
      ) {
        if (
          objectiveAnswers < 20
        ) {
          return router.createUrlTree(
            [
              '/teste/perguntas',
            ],
            {
              queryParams: {
                testId:
                  attempt.testId,

                attemptId:
                  attempt.id,
              },
            },
          );
        }

        if (
          objectiveAnswers < 23
        ) {
          return router.createUrlTree(
            [
              '/teste/listening',
            ],
            {
              queryParams: {
                testId:
                  attempt.testId,

                attemptId:
                  attempt.id,
              },
            },
          );
        }

        const [
          savedSpeakingAnswers,
          requiredSpeakingQuestions,
        ] =
          await Promise.all([
            testRepository
              .countSavedSpeakingAnswers(
                attempt.id,
              ),

            testRepository
              .countRequiredSpeakingQuestions(
                attempt.testId,
              ),
          ]);

        if (
          requiredSpeakingQuestions ===
            0 ||
          savedSpeakingAnswers <
            requiredSpeakingQuestions
        ) {
          return router.createUrlTree(
            [
              '/teste/speaking',
            ],
            {
              queryParams: {
                testId:
                  attempt.testId,

                attemptId:
                  attempt.id,
              },
            },
          );
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error(
        'Could not validate test attempt:',
        error,
      );

      return router.createUrlTree(
        [
          '/teste/dados',
        ],
      );
    }
  };
