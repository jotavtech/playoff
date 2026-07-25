import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { sessionize } from '../src/sessionize.js'
import type { Listen, PlayerSample, SessionizeOptions } from '../src/types.js'
import { phaseSweep, scenarios, SWEEP_STEPS, type Run, type Scenario } from './scenarios.js'

/**
 * Verificação independente do sessionizador.
 *
 * Este arquivo nunca é ajustado para o `sessionize` passar. Quando um caso falha, a
 * falha É o resultado da fase: o critério do PRD §10 ("9 de 10 casos à mão") aceita
 * uma implementação quebrada porque casos escolhidos à mão são os fáceis, e um skip
 * falso, depois de gravado, é indistinguível de um real.
 */

const DEFAULT_TOL = 0.02

function execute(samples: PlayerSample[], options: SessionizeOptions): Run {
  try {
    return { ok: true, listens: sessionize(samples, options) }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error : new Error(String(error)) }
  }
}

function iso(d: Date): string {
  return d.toISOString().slice(11, 23)
}

function show(listens: Listen[]): string {
  if (listens.length === 0) return '    (nenhuma escuta emitida)'
  return listens
    .map(
      (l, i) =>
        `    #${i} ${l.trackId} ${l.outcome} completion=${l.completion.toFixed(3)} ` +
        `listened=${l.listenedMs}ms [${iso(l.startedAt)} → ${iso(l.endedAt)}]`
    )
    .join('\n')
}

function header(s: Scenario): string {
  return s.why ? `[${s.origin}] verdade: ${s.why}` : `[${s.origin}]`
}

// ── cenários com verdade conhecida ───────────────────────────────────────────

describe('cenários com verdade conhecida', () => {
  for (const s of scenarios) {
    it(s.name, () => {
      const run = execute(s.samples, s.options)
      if (!run.ok) {
        assert.fail(
          `${header(s)}\n    esperado: ${s.expected.length} escuta(s)\n` +
            `    veio: sessionize LANÇOU — ${run.error.message}`
        )
      }
      const got = run.listens
      assert.equal(
        got.length,
        s.expected.length,
        `${header(s)}\n    esperado: ${s.expected.length} escuta(s)\n` +
          `    veio: ${got.length}\n${show(got)}`
      )

      for (const [i, exp] of s.expected.entries()) {
        const l = got[i]!
        const tol = exp.tol ?? DEFAULT_TOL
        assert.equal(
          l.outcome,
          exp.outcome,
          `${header(s)}\n    escuta #${i}: esperado outcome '${exp.outcome}', ` +
            `veio '${l.outcome}'\n${show(got)}`
        )
        assert.ok(
          Math.abs(l.completion - exp.completion) <= tol,
          `${header(s)}\n    escuta #${i}: esperado completion ${exp.completion.toFixed(3)} ` +
            `(±${tol}), veio ${l.completion.toFixed(3)}\n${show(got)}`
        )
        if (exp.trackId !== undefined) {
          assert.equal(
            l.trackId,
            exp.trackId,
            `${header(s)}\n    escuta #${i}: esperado trackId ${exp.trackId}, veio ${l.trackId}`
          )
        }
        if (exp.deviceType !== undefined) {
          assert.equal(
            l.deviceType,
            exp.deviceType,
            `${header(s)}\n    escuta #${i}: esperado deviceType ${exp.deviceType}, ` +
              `veio ${String(l.deviceType)}`
          )
        }
      }
    })
  }
})

// ── varredura de fase ────────────────────────────────────────────────────────
//
// Uma única fase fixa passa enquanto o algoritmo está sistematicamente errado: o
// erro do amostrador travado em fase é constante, não ruído. Cada grupo abaixo roda
// o mesmo comportamento em 40 fases sobre [0, 20s) e cobra a invariante em TODAS.

describe('varredura de fase do amostrador', () => {
  const groups = new Map<string, ReturnType<typeof phaseSweep>>()
  for (const c of phaseSweep()) {
    const label = c.name.slice(0, c.name.indexOf(' @ fase'))
    const bucket = groups.get(label)
    if (bucket) bucket.push(c)
    else groups.set(label, [c])
  }

  for (const [label, cases] of groups) {
    it(`${label}: invariante vale em todas as ${cases.length} fases`, () => {
      const failures: string[] = []
      for (const c of cases) {
        const run = execute(c.samples, c.options)
        if (!run.ok) {
          failures.push(`fase ${c.phaseMs}ms: LANÇOU — ${run.error.message}`)
          continue
        }
        if (run.listens.length !== 1) {
          failures.push(`fase ${c.phaseMs}ms: esperava 1 escuta, veio ${run.listens.length}`)
          continue
        }
        const l = run.listens[0]!
        if (l.outcome !== c.expectedOutcome) {
          failures.push(
            `fase ${c.phaseMs}ms: outcome '${l.outcome}', esperado '${c.expectedOutcome}' ` +
              `(completion ${l.completion.toFixed(3)})`
          )
        }
        if (l.completion < c.minCompletion || l.completion > c.maxCompletion) {
          failures.push(
            `fase ${c.phaseMs}ms: completion ${l.completion.toFixed(3)} fora de ` +
              `[${c.minCompletion.toFixed(3)}, ${c.maxCompletion.toFixed(3)}]`
          )
        }
      }
      assert.ok(
        failures.length === 0,
        `${failures.length} de ${cases.length} fases violam a invariante:\n    ` +
          failures.join('\n    ')
      )
    })
  }

  it('a varredura cobre 40 fases por comportamento', () => {
    assert.equal(SWEEP_STEPS, 40)
    for (const [label, cases] of groups) {
      assert.equal(cases.length, SWEEP_STEPS, `grupo ${label} tem ${cases.length} fases`)
    }
  })
})

// ── invariantes globais ──────────────────────────────────────────────────────
//
// Estas valem para TODO cenário do arquivo. Ao contrário das expectativas caso a
// caso, elas não dependem de a verdade estar bem estimada: são propriedades que o
// modelo de dados do PRD §5 precisa ter para a linha do tempo do ARCHIVE somar.

interface Emitted {
  scenario: Scenario
  listens: Listen[]
}

const emitted: Emitted[] = []
const threw: { scenario: Scenario; message: string }[] = []
for (const s of scenarios) {
  const run = execute(s.samples, s.options)
  if (run.ok) emitted.push({ scenario: s, listens: run.listens })
  else threw.push({ scenario: s, message: run.error.message })
}

function checkAll(check: (e: Emitted) => string[]): void {
  const failures: string[] = []
  for (const e of emitted) {
    for (const v of check(e)) failures.push(`${e.scenario.name}\n      ${v}`)
  }
  assert.ok(failures.length === 0, `${failures.length} violação(ões):\n    ` + failures.join('\n    '))
}

describe('invariantes globais', () => {
  it('completion nunca passa de 1.02', () => {
    checkAll(({ listens }) =>
      listens
        .filter((l) => l.completion > 1.02)
        .map((l) => `${l.trackId} completion=${l.completion.toFixed(3)}`)
    )
  })

  // A invariante óbvia aqui seria "nenhuma escuta 'completed' tem completion
  // baixa". Ela está ERRADA, e afirmá-la reintroduziria justamente a confusão que
  // este sistema precisa evitar: `outcome` diz como a reprodução TERMINOU,
  // `completion` diz quanto foi OUVIDO. São perguntas diferentes e nenhuma das duas
  // é proxy da outra. Uma faixa retomada depois de uma pausa termina de verdade
  // tendo ouvido metade; arrastar para o último acorde termina de verdade tendo
  // ouvido 19%. Ambas são `completed` com completion baixa, e ambas estão certas.
  //
  // A checagem que vale é a do outro lado, onde a inconsistência seria real: se a
  // faixa inteira foi ouvida, ela não foi pulada.
  it("nenhuma escuta 'skipped' tem completion perto de 1", () => {
    checkAll(({ listens }) =>
      listens
        .filter((l) => l.outcome === 'skipped' && l.completion > 0.99)
        .map(
          (l) =>
            `${l.trackId} skipped com completion=${l.completion.toFixed(3)} ` +
            `(listened=${l.listenedMs}ms de ${l.durationMs}ms)`
        )
    )
  })

  it('nenhuma escuta termina antes de começar', () => {
    checkAll(({ listens }) =>
      listens
        .filter((l) => l.endedAt.getTime() < l.startedAt.getTime())
        .map((l) => `${l.trackId} [${iso(l.startedAt)} → ${iso(l.endedAt)}]`)
    )
  })

  it('escutas nunca se sobrepõem no tempo', () => {
    checkAll(({ listens }) => {
      const sorted = [...listens].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
      const out: string[] = []
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1]!
        const curr = sorted[i]!
        if (curr.startedAt.getTime() < prev.endedAt.getTime()) {
          out.push(
            `${curr.trackId} começa ${iso(curr.startedAt)} antes de ${prev.trackId} ` +
              `terminar ${iso(prev.endedAt)}`
          )
        }
      }
      return out
    })
  })

  it('a soma de listenedMs não passa do tempo de parede do cenário', () => {
    checkAll(({ scenario, listens }) => {
      if (listens.length === 0) return []
      const sum = listens.reduce((acc, l) => acc + l.listenedMs, 0)
      // Janela = da primeira evidência à última, incluindo o que foi reconstruído
      // fora das amostras (cabeça e cauda são áudio real, só não observado).
      const first = Math.min(
        scenario.samples[0]!.observedAt.getTime(),
        ...listens.map((l) => l.startedAt.getTime())
      )
      const last = Math.max(
        scenario.samples.at(-1)!.observedAt.getTime(),
        ...listens.map((l) => l.endedAt.getTime())
      )
      const span = last - first
      return sum > span
        ? [`soma listened=${sum}ms excede a janela de ${span}ms (${sum - span}ms fabricados)`]
        : []
    })
  })

  it('nenhum cenário faz sessionize lançar', () => {
    assert.ok(
      threw.length === 0,
      `${threw.length} cenário(s) lançaram:\n    ` +
        threw.map((x) => `${x.scenario.name}\n      ${x.message}`).join('\n    ')
    )
  })
})
