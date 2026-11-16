import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { Activity, BookOpenCheck, CheckCircle2, ChevronRight, Lightbulb, RefreshCw, Sigma, Sparkles } from "lucide-react";
import "./MathEquationStudio.css";
import LabGraphSheet, { type LabGraphConfig, type LabNumberLineConfig } from "./LabGraphSheet";

type Pathway = "Primary" | "Secondary High" | "High School" | "Matric" | "Tertiary";
type Topic = "arithmetic" | "linear" | "quadratic" | "systems" | "rational" | "radical" | "exponential" | "logarithmic" | "absolute" | "word-problems" | "inequalities" | "systems3" | "polynomial" | "trigonometry";
type Problem = { topic: Topic; pathway: Pathway; prompt: string; answer: number[]; textAnswer?: string; steps: string[]; methodSteps?: Record<string, string[]>; graph?: LabGraphConfig; numberLine?: LabNumberLineConfig; orderedAnswers?: boolean; hint: string; domain: string; methods: string[]; methodNote: string };
type TopicMeta = { id: Topic; title: string; description: string; pathways: Pathway[] };
type StudioHistoryAttempt = { id?: string; topic: Topic; correct: boolean; created_at?: string };
type PendingStudioAttempt = {
  id: string; learner_id: string; material_id: null; subject_name: string; topic: string;
  material_snapshot: any; responses: any; result: any; score: number; max_score: number;
  percentage: number; duration_seconds: number; mode: "practice"; status: "submitted";
  attempt_number: number; retake_mode: "original"; retake_of: null; created_at: string; submitted_at: string;
};

const topics: TopicMeta[] = [
  { id: "arithmetic", title: "Arithmetic & pre-algebra", description: "Fractions, decimals, negative numbers and order of operations", pathways: ["Primary", "Secondary High", "High School", "Matric", "Tertiary"] },
  { id: "linear", title: "Linear equations", description: "Inverse operations and the balance principle", pathways: ["Primary", "Secondary High", "High School", "Matric", "Tertiary"] },
  { id: "quadratic", title: "Quadratic equations", description: "Factorisation and the quadratic formula", pathways: ["Secondary High", "High School", "Matric", "Tertiary"] },
  { id: "systems", title: "Simultaneous equations", description: "Elimination and substitution in two variables", pathways: ["Secondary High", "High School", "Matric", "Tertiary"] },
  { id: "rational", title: "Rational equations", description: "Fractions, restrictions and excluded values", pathways: ["High School", "Matric", "Tertiary"] },
  { id: "radical", title: "Radical equations", description: "Isolating roots and checking candidates", pathways: ["High School", "Matric", "Tertiary"] },
  { id: "exponential", title: "Exponential equations", description: "Rewrite both sides with a common base", pathways: ["Matric", "Tertiary"] },
  { id: "logarithmic", title: "Logarithmic equations", description: "Log definitions, laws and domain checks", pathways: ["Matric", "Tertiary"] },
  { id: "absolute", title: "Absolute-value equations", description: "Split into positive and negative cases", pathways: ["High School", "Matric", "Tertiary"] },
  { id: "word-problems", title: "Equation word problems", description: "Translate real-world scenarios into equations", pathways: ["Secondary High", "High School", "Matric", "Tertiary"] },
  { id: "inequalities", title: "Linear inequalities", description: "Solve inequalities and preserve the solution region", pathways: ["Secondary High", "High School", "Matric", "Tertiary"] },
  { id: "systems3", title: "Three-variable systems", description: "Solve 3×3 linear systems with elimination", pathways: ["Matric", "Tertiary"] },
  { id: "polynomial", title: "Polynomial equations", description: "Factor cubic expressions and use the zero-product rule", pathways: ["High School", "Matric", "Tertiary"] },
  { id: "trigonometry", title: "Basic trigonometric equations", description: "Circular functions and solutions in a stated interval", pathways: ["Matric", "Tertiary"] },
];
const historyKey = "studyspace:math-equation-studio:v1";
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const signed = (value: number) => value < 0 ? " − " + Math.abs(value) : " + " + value;
const multiply = (a: number, variable: string) => a === 1 ? variable : a === -1 ? "−" + variable : a + variable;

function createProblem(topic: Topic, pathway: Pathway, difficulty: "guided" | "independent" | "challenge" = "guided"): Problem {
  if (topic === "arithmetic") {
    const variant = randomInt(0, 4);
    if (variant === 0) {
      const a = randomInt(2, difficulty === "challenge" ? 90 : 30), b = randomInt(2, difficulty === "challenge" ? 90 : 30);
      return { topic, pathway, prompt: a + " + " + b + " = ?", answer: [a + b], hint: "Add the ones first, then the tens. Estimate the answer to check it makes sense.", domain: "Whole numbers", methods: ["Column addition", "Number-line method"], methodNote: "Addition combines quantities. Keep place values aligned when adding larger numbers.", steps: ["Write " + a + " + " + b + ".", "Add the ones, carrying if their total is 10 or more.", "Add the tens and any carried value.", "The total is " + (a + b) + ".", "Estimate and check the sum."] };
    }
    if (variant === 1) {
      const a = randomInt(3, 18), b = randomInt(1, 8);
      return { topic, pathway, prompt: "−" + a + " + " + (a + b) + " = ?", answer: [b], hint: "Start at the negative number on a number line, then move right by the positive amount.", domain: "Integers", methods: ["Number-line method", "Additive inverse"], methodNote: "A negative number represents movement left of zero; a positive number moves right.", steps: ["Start at −" + a + " on the number line.", "Adding " + (a + b) + " means move " + (a + b) + " places to the right.", "You pass zero and finish at " + b + ".", "Check the result on the number line."] };
    }
    if (variant === 2) {
      const a = Number((randomInt(10, 90) / 10).toFixed(1)), b = Number((randomInt(10, 90) / 10).toFixed(1));
      return { topic, pathway, prompt: a.toFixed(1) + " + " + b.toFixed(1) + " = ?", answer: [Number((a + b).toFixed(2))], hint: "Line up the decimal points. Add tenths to tenths and ones to ones.", domain: "Terminating decimals", methods: ["Place-value alignment", "Convert to fractions"], methodNote: "Align decimal points before adding so each digit keeps its place value.", steps: ["Write the numbers with decimal points aligned.", "Add the tenths and hundredths columns.", "Add the whole-number part.", "The sum is " + (a + b).toFixed(2) + ".", "Estimate to check the result."] };
    }
    if (variant === 3) {
      const denominator = [2, 4, 5, 10][randomInt(0, 3)], numeratorA = randomInt(1, denominator - 1), numeratorB = randomInt(1, denominator - 1);
      const answer = Number(((numeratorA + numeratorB) / denominator).toFixed(3));
      return { topic, pathway, prompt: numeratorA + "/" + denominator + " + " + numeratorB + "/" + denominator + " = ?", answer: [answer], hint: "The denominators are the same. Add the numerators and keep the denominator.", domain: "Fractions with a common denominator", methods: ["Fraction arithmetic", "Convert to decimals"], methodNote: "When denominators match, add the numerators and keep the shared denominator.", steps: ["Keep the denominator " + denominator + ".", "Add the numerators: " + numeratorA + " + " + numeratorB + " = " + (numeratorA + numeratorB) + ".", "The result is " + (numeratorA + numeratorB) + "/" + denominator + ".", "As a decimal this is " + answer + ".", "Simplify the fraction if possible."] };
    }
    const a = randomInt(2, 9), b = randomInt(2, 9), d = randomInt(2, 5);
    return { topic, pathway, prompt: a + " + " + b + " × " + d + " = ?", answer: [a + b * d], hint: "Remember the order of operations: multiplication before addition.", domain: "Whole numbers", methods: ["Order of operations", "Step-by-step evaluation"], methodNote: "Apply multiplication before addition or subtraction unless brackets change the order.", steps: ["Identify the multiplication: " + b + " × " + d + ".", "Multiply first: " + (b * d) + ".", "Then add " + a + ".", "The answer is " + (a + b * d) + ".", "Check the order: do not add before multiplying."] };
  }

  if (topic === "linear") {
    const a = pathway === "Primary" ? 1 : randomInt(2, difficulty === "challenge" ? 12 : difficulty === "independent" ? 9 : 5);
    const x = pathway === "Primary" ? randomInt(1, 10) : randomInt(difficulty === "challenge" ? -12 : difficulty === "independent" ? -8 : -4, difficulty === "challenge" ? 15 : difficulty === "independent" ? 10 : 6);
    const b = pathway === "Primary" ? randomInt(1, 10) : randomInt(difficulty === "challenge" ? -20 : difficulty === "independent" ? -12 : -6, difficulty === "challenge" ? 20 : difficulty === "independent" ? 15 : 8);
    const c = a * x + b;
    return { topic, pathway, prompt: multiply(a, "x") + signed(b) + " = " + c, answer: [x], hint: "Undo the addition or subtraction first. Whatever you do to one side, do to the other.", domain: "All real numbers", methods: ["Balance / inverse operations", "Graph both sides"], methodNote: "The balance method keeps the two sides equivalent at every step.", steps: ["Start with " + multiply(a, "x") + signed(b) + " = " + c + ".", "Subtract " + b + " from both sides: " + multiply(a, "x") + " = " + (c - b) + ".", "Divide both sides by " + a + ".", "Therefore x = " + x + ".", "Check: substitute x = " + x + " into the original equation."], graph: { title: "Compare both sides of the linear equation", points: [{ x, y: c, label: "Solution (" + x + ", " + c + ")" }], xMin: x - 7, xMax: x + 7, xLabel: "x", yLabel: "y", curves: [{ label: "Left side", evaluate: value => a * value + b }, { label: "Right side", evaluate: () => c }] } };
  }
  if (topic === "inequalities") {
    const a = randomInt(2, 8) * (Math.random() < 0.5 ? 1 : -1), root = randomInt(-8, 10), b = randomInt(-10, 10);
    const relation = Math.random() < 0.5 ? "<" : ">";
    const c = a * root + b;
    const finalRelation = a < 0 ? (relation === "<" ? ">" : "<") : relation;
    const expression = multiply(a, "x") + signed(b) + " " + relation + " " + c;
    const textAnswer = "x " + finalRelation + " " + root;
    return { topic, pathway, prompt: expression, answer: [root], textAnswer, hint: "Isolate the x-term using the same operation on both sides. If you divide by a negative number, reverse the inequality sign.", domain: "All real numbers", methods: ["Inequality balance method", "Number-line solution"], methodNote: "Use equivalent operations on both sides. Multiplying or dividing by a negative number reverses the inequality sign.", steps: ["Start with " + expression + ".", "Subtract " + b + " from both sides to isolate the x-term.", "Divide both sides by " + a + ".", a < 0 ? "Because you divided by a negative number, reverse the inequality sign." : "The inequality sign stays in the same direction because you divided by a positive number.", "Solution: " + textAnswer + ".", "Check a test value from the solution region in the original inequality."], numberLine: { boundary: root, direction: finalRelation === "<" ? "left" : "right", inclusive: false } };
  }
  if (topic === "systems3") {
    const x = randomInt(-4, 5), y = randomInt(-4, 5), z = randomInt(-4, 5);
    const c = x + y + z, f = 2 * x - y + z, g = x + 2 * y - z;
    return { topic, pathway, prompt: "x + y + z = " + c + "     2x − y + z = " + f + "     x + 2y − z = " + g, answer: [x, y, z], hint: "Use elimination to remove x from two equations, then eliminate y to solve for z. Back-substitute to find x and y.", domain: "One unique solution", orderedAnswers: true, methods: ["Gaussian elimination", "Elimination"], methodNote: "Use row operations or elimination to reduce the three equations to one variable, then back-substitute.", steps: ["Label the equations (1), (2) and (3).", "Subtract 2 × (1) from (2): −3y − z = " + (f - 2 * c) + ".", "Subtract (1) from (3): y − 2z = " + (g - c) + ".", "Add 3 × the second reduced equation to the first reduced equation: −7z = " + (f + 3 * g - 5 * c) + ".", "Solve z = " + z + ".", "Back-substitute to get y = " + y + " and x = " + x + ".", "Check all three values in the original equations."] };
  }
  if (topic === "polynomial") {
    let r1 = randomInt(-4, 4), r2 = randomInt(-4, 4), r3 = randomInt(-4, 4);
    while (r2 === r1) r2 = randomInt(-4, 4);
    while (r3 === r1 || r3 === r2) r3 = randomInt(-4, 4);
    const a = -(r1 + r2 + r3), b = r1 * r2 + r1 * r3 + r2 * r3, d = -(r1 * r2 * r3);
    const factors = "(x " + (r1 < 0 ? "+ " + Math.abs(r1) : "− " + r1) + ")(x " + (r2 < 0 ? "+ " + Math.abs(r2) : "− " + r2) + ")(x " + (r3 < 0 ? "+ " + Math.abs(r3) : "− " + r3) + ") = 0";
    return { topic, pathway, prompt: "x³" + signed(a) + "x²" + signed(b) + "x" + signed(d) + " = 0", answer: [r1, r2, r3], hint: "Look for integer roots using factors of the constant term, then use the factor theorem and zero-product rule.", domain: "All real numbers", methods: ["Factor theorem", "Factorisation"], methodNote: "A root r gives a factor (x − r). Factor the cubic, then set each factor equal to zero.", steps: ["Write the cubic in standard form.", "Use the factor theorem to identify integer roots.", "Factor the expression: " + factors + ".", "Set each factor equal to zero.", "The three roots are " + [r1, r2, r3].join(", ") + ".", "Substitute each root into the original polynomial to verify."] };
  }
  if (topic === "word-problems") {
    const rate = randomInt(25, difficulty === "challenge" ? 120 : 80);
    const time = randomInt(2, difficulty === "challenge" ? 12 : 8);
    const distance = rate * time;
    return { topic, pathway, prompt: "A minibus travels at a steady " + rate + " km/h and covers " + distance + " km. How many hours does the journey take?", answer: [time], hint: "Use distance = speed × time. Let t represent the time, then rearrange to make t the subject.", domain: "Time must be positive", methods: ["Define a variable", "Form and solve an equation", "Unit analysis"], methodNote: "Translate the known quantities into an equation, define the unknown, then solve and check the units.", steps: ["Let t be the journey time in hours.", "Use distance = speed × time: " + distance + " = " + rate + " × t.", "Divide both sides by " + rate + ".", "t = " + distance + " ÷ " + rate + " = " + time + ".", "Check: " + rate + " × " + time + " = " + distance + " km.", "The journey takes " + time + " hours."] };
  }
  if (topic === "quadratic") {
    let r1 = randomInt(difficulty === "challenge" ? -9 : difficulty === "independent" ? -6 : -4, difficulty === "challenge" ? 9 : difficulty === "independent" ? 6 : 4), r2 = randomInt(difficulty === "challenge" ? -9 : difficulty === "independent" ? -6 : -4, difficulty === "challenge" ? 9 : difficulty === "independent" ? 6 : 4);
    while (r1 === r2) r2 = randomInt(-6, 6);
    const b = -(r1 + r2), c = r1 * r2;
    const factor = "(x " + (r1 < 0 ? "+ " + Math.abs(r1) : "− " + r1) + ")(x " + (r2 < 0 ? "+ " + Math.abs(r2) : "− " + r2) + ") = 0";
    const discriminant = b * b - 4 * c;
    const formulaSteps = ["Write the equation in standard form: x²" + signed(b) + signed(c) + " = 0.", "Identify a = 1, b = " + b + " and c = " + c + ".", "Calculate the discriminant: D = b² − 4ac = " + discriminant + ".", "Substitute into x = (−b ± √D) / 2a.", "Evaluate both roots: x = " + r1 + " and x = " + r2 + ".", "Substitute both roots into the original equation to verify."];
    const graphSteps = ["Graph y = x²" + signed(b) + signed(c) + " and the x-axis.", "The solutions are the x-intercepts where the curve crosses y = 0.", "Read the intercepts: x = " + r1 + " and x = " + r2 + ".", "Substitute both values into the original equation to verify."];
        return { topic, pathway, prompt: "x²" + signed(b) + signed(c) + " = 0", answer: [r1, r2], hint: "Look for two numbers whose product is the constant term and whose sum is the coefficient of x.", domain: "All real numbers", methods: ["Factorisation", "Quadratic formula", "Graphing"], methodNote: "Factorisation is efficient when integer factors are visible. The quadratic formula works for every quadratic with a ≠ 0.", steps: ["Write the equation in standard form ax² + bx + c = 0.", "Find two numbers with product " + c + " and sum " + b + ".", "Factor: " + factor + ".", "Use the zero-product rule: x " + (r1 < 0 ? "+ " + Math.abs(r1) : "− " + r1) + " = 0 or x " + (r2 < 0 ? "+ " + Math.abs(r2) : "− " + r2) + " = 0.", "Solutions: x = " + r1 + " and x = " + r2 + ".", "Substitute both roots into the original equation to verify."], methodSteps: { "Quadratic formula": formulaSteps, "Graphing": graphSteps }, graph: { title: "Quadratic curve and its roots", points: [{ x: r1, y: 0, label: "x = " + r1 }, { x: r2, y: 0, label: "x = " + r2 }], xMin: Math.min(r1, r2) - 5, xMax: Math.max(r1, r2) + 5, xLabel: "x", yLabel: "y", curves: [{ label: "y = x² + bx + c", evaluate: value => value * value + b * value + c }, { label: "x-axis", evaluate: () => 0 }] } };
  }
  if (topic === "systems") {
    let a = randomInt(1, difficulty === "challenge" ? 9 : 5), b = randomInt(1, difficulty === "challenge" ? 9 : 5), d = randomInt(1, difficulty === "challenge" ? 9 : 5), e = randomInt(1, difficulty === "challenge" ? 9 : 5);
    while (a * e - b * d === 0) { d = randomInt(1, 5); e = randomInt(1, 5); }
    const x = randomInt(difficulty === "challenge" ? -8 : -4, difficulty === "challenge" ? 8 : 5), y = randomInt(difficulty === "challenge" ? -8 : -4, difficulty === "challenge" ? 8 : 5), c = a * x + b * y, f = d * x + e * y;
    const substitutionSteps = ["Rearrange equation (1): x = (" + c + " − " + b + "y) / " + a + ".", "Substitute into equation (2): " + d + "((" + c + " − " + b + "y) / " + a + ") + " + e + "y = " + f + ".", "Solve the resulting equation for y: y = " + y + ".", "Substitute y = " + y + " into equation (1): x = " + x + ".", "Solution: x = " + x + ", y = " + y + ".", "Check both values in both original equations."];
    const graphSteps = ["Graph both linear equations on the same coordinate plane.", "The solution is the intersection point of the two lines.", "The intersection is (" + x + ", " + y + ").", "Substitute the point into both equations to verify."];
        return { topic, pathway, prompt: a + "x + " + b + "y = " + c + "     and     " + d + "x + " + e + "y = " + f, answer: [x, y], hint: "Choose elimination or substitution. Elimination removes one variable so you can solve for the other.", domain: "One unique solution (non-zero determinant)", orderedAnswers: true, methods: ["Elimination", "Substitution", "Graphing"], methodNote: "Elimination is often efficient when coefficients can be matched. Substitution is useful when one variable is already isolated.", steps: ["Label the equations (1) and (2).", "Multiply one or both equations so the coefficients of y (or x) are opposites.", "Add the equations to eliminate that variable.", "Solve the resulting one-variable equation.", "Substitute that value into either original equation.", "Solution: x = " + x + ", y = " + y + ". Check both original equations."], methodSteps: { "Substitution": substitutionSteps, "Graphing": graphSteps }, graph: { title: "Intersection of simultaneous equations", points: [{ x, y, label: "(" + x + ", " + y + ")" }], xMin: x - 8, xMax: x + 8, xLabel: "x", yLabel: "y", curves: [{ label: "Equation 1", evaluate: value => (c - a * value) / b }, { label: "Equation 2", evaluate: value => (f - d * value) / e }] } };
  }
  if (topic === "rational") {
    const h = randomInt(-5, 5), m = randomInt(1, 5), q = randomInt(1, 5), k = m * q, x = h + q;
    return { topic, pathway, prompt: k + " / (x " + (h < 0 ? "+ " + Math.abs(h) : "− " + h) + ") = " + m, answer: [x], hint: "First state which value makes the denominator zero. Then multiply both sides by the denominator.", domain: "x ≠ " + h, methods: ["Clear the denominator", "Equivalent multiplication", "Graph both sides"], methodNote: "Multiplying by a variable expression is valid only while its denominator is non-zero.", steps: ["Domain restriction: x ≠ " + h + ".", "Multiply both sides by (x " + (h < 0 ? "+ " + Math.abs(h) : "− " + h) + ").", "This gives " + k + " = " + m + "(x " + (h < 0 ? "+ " + Math.abs(h) : "− " + h) + ").", "Divide by " + m + ", then isolate x.", "Candidate solution: x = " + x + ".", "Check x = " + x + " in the original equation. It is allowed because it is not " + h + "."], graph: { title: "Rational equation and excluded value", points: [{ x, y: m, label: "Solution x = " + x }], xMin: h - 8, xMax: h + 8, yMin: -10, yMax: 10, xLabel: "x", yLabel: "y", curves: [{ label: "Left side", evaluate: value => Math.abs(value - h) < .08 ? null : k / (value - h) }, { label: "Right side", evaluate: () => m }] } };
  }
  if (topic === "radical") {
    const a = randomInt(-6, 8), root = randomInt(2, 8), x = root * root - a;
    return { topic, pathway, prompt: "√(x " + (a < 0 ? "− " + Math.abs(a) : "+ " + a) + ") = " + root, answer: [x], hint: "Isolate the square root, square both sides, then substitute your candidate into the original equation.", domain: "x " + (a < 0 ? "≥ " + Math.abs(a) : "≥ " + -a), methods: ["Isolate and square", "Graph both sides"], methodNote: "Squaring is not a reversible operation in every context. Always check for extraneous roots.", steps: ["The square root is already isolated.", "Square both sides: x " + (a < 0 ? "− " + Math.abs(a) : "+ " + a) + " = " + (root * root) + ".", "Isolate x: x = " + x + ".", "Check the domain and substitute x = " + x + " into the original equation.", "The left side is √" + (x + a) + " = " + root + ", so the candidate is valid."], graph: { title: "Radical equation and horizontal line", points: [{ x, y: root, label: "Solution x = " + x }], xMin: -a - 3, xMax: x + 5, xLabel: "x", yLabel: "y", curves: [{ label: "Square-root curve", evaluate: value => value + a < 0 ? null : Math.sqrt(value + a) }, { label: "Right side", evaluate: () => root }] } };
  }
  if (topic === "exponential") {
    const base = randomInt(2, 4), shift = randomInt(-4, 5), power = randomInt(1, 5), x = power - shift;
    return { topic, pathway, prompt: base + "^(x " + (shift < 0 ? "− " + Math.abs(shift) : "+ " + shift) + ") = " + base + "^" + power, answer: [x], hint: "Both sides already have the same base. Equate the exponents, provided the base is positive and not 1.", domain: "All real x (base " + base + " is positive and not 1)", methods: ["Common-base method", "Logarithms", "Graph both sides"], methodNote: "When equal positive bases (not 1) are on both sides, their exponents must be equal.", steps: ["The bases are equal: " + base + ".", "Equate exponents: x " + (shift < 0 ? "− " + Math.abs(shift) : "+ " + shift) + " = " + power + ".", "Undo the shift on both sides.", "Therefore x = " + x + ".", "Substitute the value to confirm both powers match."], graph: { title: "Exponential equation: compare both sides", points: [{ x, y: Math.pow(base, power), label: "Solution x = " + x }], xMin: x - 2.5, xMax: x + 2.5, yMin: 0, yMax: Math.pow(base, power + 2), xLabel: "x", yLabel: "y", curves: [{ label: "Exponential side", evaluate: value => Math.pow(base, value + shift) }, { label: "Constant side", evaluate: () => Math.pow(base, power) }] } };
  }
  if (topic === "logarithmic") {
    const base = randomInt(2, 5), power = randomInt(1, 4), shift = randomInt(-5, 5), x = Math.pow(base, power) - shift;
    return { topic, pathway, prompt: "log" + base + "(x " + (shift < 0 ? "− " + Math.abs(shift) : "+ " + shift) + ") = " + power, answer: [x], hint: "Convert the logarithm to exponential form: log_b(A) = n means A = bⁿ.", domain: "The logarithm argument must be greater than 0", methods: ["Convert to exponential form", "Use logarithm laws", "Graph both sides"], methodNote: "A logarithm is defined only when its argument is positive and its base is positive and not 1.", steps: ["Convert to exponential form: x " + (shift < 0 ? "− " + Math.abs(shift) : "+ " + shift) + " = " + base + "^" + power + ".", "Evaluate the power: " + Math.pow(base, power) + ".", "Isolate x: x = " + x + ".", "Domain check: x " + (shift < 0 ? "− " + Math.abs(shift) : "+ " + shift) + " = " + Math.pow(base, power) + " > 0.", "The solution is valid."], graph: { title: "Logarithmic equation and horizontal line", points: [{ x, y: power, label: "Solution x = " + x }], xMin: -shift + .05, xMax: x + Math.max(5, x * .2), yMin: -3, yMax: power + 3, xLabel: "x", yLabel: "y", curves: [{ label: "Logarithmic side", evaluate: value => value + shift <= 0 ? null : Math.log(value + shift) / Math.log(base) }, { label: "Right side", evaluate: () => power }] } };
  }
  if (topic === "absolute") {
    const centre = randomInt(-8, 8), distance = randomInt(1, 7);
    return { topic, pathway, prompt: "|x " + (centre < 0 ? "+ " + Math.abs(centre) : "− " + centre) + "| = " + distance, answer: [centre - distance, centre + distance], hint: "An absolute value measures distance. There are usually two cases: the inside is positive or negative.", domain: "All real numbers", methods: ["Positive / negative cases", "Graphing"], methodNote: "For |u| = k with k > 0, solve u = k and u = −k.", steps: ["Split into two cases: x " + (centre < 0 ? "+ " + Math.abs(centre) : "− " + centre) + " = " + distance + " OR x " + (centre < 0 ? "+ " + Math.abs(centre) : "− " + centre) + " = −" + distance + ".", "Solve the first case: x = " + (centre + distance) + ".", "Solve the second case: x = " + (centre - distance) + ".", "Both values are valid because each is exactly " + distance + " units from " + centre + "."], graph: { title: "Absolute-value V graph", points: [{ x: centre - distance, y: distance, label: "x = " + (centre - distance) }, { x: centre + distance, y: distance, label: "x = " + (centre + distance) }], xMin: centre - distance - 6, xMax: centre + distance + 6, xLabel: "x", yLabel: "y", curves: [{ label: "Absolute-value curve", evaluate: value => Math.abs(value - centre) }, { label: "Constant side", evaluate: () => distance }] } };
  }
  const trigOptions = [
    { fn: "sin", value: "1/2", roots: [30, 150], quadrants: "I and II" },
    { fn: "sin", value: "√3/2", roots: [60, 120], quadrants: "I and II" },
    { fn: "sin", value: "−1/2", roots: [210, 330], quadrants: "III and IV" },
    { fn: "cos", value: "1/2", roots: [60, 300], quadrants: "I and IV" },
    { fn: "cos", value: "−1/2", roots: [120, 240], quadrants: "II and III" },
    { fn: "tan", value: "1", roots: [45, 225], quadrants: "I and III" },
  ];
  const selected = trigOptions[randomInt(0, trigOptions.length - 1)], roots = selected.roots;
  const target = selected.value === "√3/2" ? Math.sqrt(3) / 2 : selected.value === "−1/2" ? -.5 : Number(selected.value);
  const trigFn = (degrees: number) => {
    const radians = degrees * Math.PI / 180;
    const value = selected.fn === "sin" ? Math.sin(radians) : selected.fn === "cos" ? Math.cos(radians) : Math.tan(radians);
    return selected.fn === "tan" && (Math.abs(Math.cos(radians)) < .035 || Math.abs(value) > 5) ? null : value;
  };
  return { topic, pathway, prompt: "Solve " + selected.fn + "(θ) = " + selected.value + " for 0° ≤ θ < 360°.", answer: roots, hint: "Find the reference angle, then use the sign of " + selected.fn + " to identify the correct quadrants.", domain: "0° ≤ θ < 360°", methods: ["Reference-angle method", "Unit-circle method", "Graphing"], methodNote: selected.fn + " has the required sign in quadrants " + selected.quadrants + ".", steps: ["Find the reference angle for the given " + selected.fn + " value.", "Locate the quadrants where " + selected.fn + " has the required sign: " + selected.quadrants + ".", "The solutions in this interval are " + roots[0] + "° and " + roots[1] + "°.", "Check both angles on the unit circle."], graph: { title: "Circular-function equation (degrees)", points: roots.map(value => ({ x: value, y: target, label: value + "°" })), xMin: 0, xMax: 360, yMin: selected.fn === "tan" ? -5 : -1.5, yMax: selected.fn === "tan" ? 5 : 1.5, xLabel: "θ (degrees)", yLabel: "y", unitNote: "Angles are measured in degrees. Tangent breaks at its vertical asymptotes.", curves: [{ label: selected.fn + "(θ)", evaluate: trigFn }, { label: "Target value", evaluate: () => target }] } };
}

function parseAnswers(value: string): number[] {
  return value.split(/[,;\s]+/).map(item => item.trim()).filter(Boolean).map(Number);
}
function answerMatches(problem: Problem, value: string) {
  if (problem.textAnswer) return value.trim().toLowerCase().replace(/\s+/g, "") === problem.textAnswer.toLowerCase().replace(/\s+/g, "");
  return sameAnswers(parseAnswers(value), problem.answer, problem.orderedAnswers);
}

function sameAnswers(actual: number[], expected: number[], ordered = false) {
  if (actual.length !== expected.length || actual.some(value => !Number.isFinite(value))) return false;
  const a = ordered ? actual : [...actual].sort((x, y) => x - y);
  const b = ordered ? expected : [...expected].sort((x, y) => x - y);
  return a.every((value, index) => Math.abs(value - b[index]) < 0.011);
}

function guidanceForMethod(method: string, topic: Topic): string {
  if (method === "Graph both sides" || method === "Graphing") return "Draw each side as a graph. The solution is the x-coordinate where the graphs intersect; check the intersection in the original equation.";
  if (method === "Quadratic formula") return "Write the equation as ax² + bx + c = 0, identify a, b and c, then use x = (−b ± √(b² − 4ac)) / 2a. Check the discriminant and both roots.";
  if (method === "Factorisation") return "Find factors that multiply to c and add to b. Set each factor equal to zero, then verify both roots in the original equation.";
  if (method === "Elimination") return "Scale the equations to make one variable's coefficients opposites. Add the equations, solve the remaining variable, then substitute back.";
  if (method === "Substitution") return "Rearrange one equation to make a variable the subject. Substitute that expression into the other equation, solve, then back-substitute.";
  if (method === "Clear the denominator") return "Record every excluded denominator value first. Multiply through by the least common denominator, solve, then reject any candidate that violates the original domain.";
  if (method === "Isolate and square") return "Isolate the radical before squaring. Squaring can introduce extraneous roots, so substitute every candidate into the original equation.";
  if (method === "Common-base method") return "Rewrite both sides with the same positive base (not 1). Equate exponents and solve the resulting equation.";
  if (method === "Logarithms") return "Take logarithms of both sides and use log laws to bring the exponent down. Check that all logarithm arguments are positive.";
  if (method === "Positive / negative cases") return "Split the absolute-value equation into two cases: the inside equals the positive value and the inside equals its negative.";
  if (method === "Reference-angle method" || method === "Unit-circle method") return "Find the reference angle, identify the quadrants with the required sign, then list every solution in the stated interval.";
  if (method === "Inequality balance method") return "Isolate the variable using equivalent operations. Reverse the inequality sign only when multiplying or dividing by a negative number.";
  if (method === "Number-line solution") return "Mark the boundary value, then shade or describe the side that satisfies the inequality. Use an open circle for a strict inequality.";
  if (method === "Gaussian elimination") return "Write the coefficients as an augmented matrix. Use row operations to create zeros below the pivots, then back-substitute.";
  if (method === "Factor theorem") return "Test possible integer roots from factors of the constant term. Each valid root gives a linear factor.";
  if (method === "Define a variable") return "Name the unknown with a variable and write down its unit. Identify the known quantities before forming an equation.";
  if (method === "Form and solve an equation") return "Translate the relationship in the story into an equation, solve it with equivalent operations, then check the result in context.";
  if (method === "Unit analysis") return "Keep units attached to each quantity. Check that the final unit answers the question being asked.";
  if (method === "Column addition") return "Align place values. Add from right to left and carry into the next column when needed.";
  if (method === "Additive inverse") return "An additive inverse is the opposite number. Pairing a number with its opposite gives zero.";
  if (method === "Convert to fractions") return "Write each decimal as a fraction with a power-of-ten denominator, then combine or simplify.";
  if (method === "Step-by-step evaluation") return "Apply one operation at a time and write the intermediate result before moving to the next operation.";
  if (method === "Order of operations") return "Evaluate brackets first, then multiplication and division, then addition and subtraction.";
  if (method === "Fraction arithmetic") return "Use a common denominator, combine the numerators, then simplify. Convert to a decimal only when the result terminates.";
  if (method === "Place-value alignment" || method === "Decimal arithmetic") return "Align decimal points and combine matching place values. Estimate the result before accepting it.";
  if (method === "Number-line method") return "Represent positive and negative values as movements along a number line. Track direction and distance from zero.";
  if (method === "Balance / inverse operations") return "Undo operations in reverse order. Apply each operation to both sides so equality is preserved.";
  if (topic === "linear") return "Use equivalent operations to isolate the unknown, then substitute your result into the original equation.";
  return "Choose a valid sequence of equivalent transformations, state any restrictions, and verify your final solution in the original equation.";
}

export default function MathEquationStudio({ subjectName = "Mathematics", studentId }: { subjectName?: string; studentId?: string | null }) {
  const [pathway, setPathway] = useState<Pathway>("High School");
  const [topic, setTopic] = useState<Topic>("linear");
  const [difficulty, setDifficulty] = useState<"guided" | "independent" | "challenge">("guided");
  const [problem, setProblem] = useState<Problem>(() => createProblem("linear", "High School"));
  const [method, setMethod] = useState("Balance / inverse operations");
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [attempts, setAttempts] = useState<StudioHistoryAttempt[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [savingAttempt, setSavingAttempt] = useState(false);
  const [cloudStatus, setCloudStatus] = useState("");
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const learnerHistoryKey = historyKey + ":" + subjectName + ":" + (studentId ?? "anonymous");
  const pendingHistoryKey = learnerHistoryKey + ":pending";

  useEffect(() => {
    let active = true;
    try {
      const saved = localStorage.getItem(learnerHistoryKey) ?? localStorage.getItem(historyKey) ?? "[]";
      setAttempts(JSON.parse(saved));
    } catch { setAttempts([]); }
    const sync = async () => {
      const client = supabase;
      if (!client) return;
      try {
        const { data: auth } = await client.auth.getUser();
        if (!auth.user || !active) return;
        let pending: PendingStudioAttempt[] = [];
        try { pending = JSON.parse(localStorage.getItem(pendingHistoryKey) || "[]"); } catch { pending = []; }
        const ownedPending = pending.filter(item => item.learner_id === auth.user.id);
        if (ownedPending.length) {
          const { error: syncError } = await client.from("lab_practice_attempts").upsert(ownedPending, { onConflict: "id" });
          if (!syncError) {
            const syncedIds = new Set(ownedPending.map(item => item.id));
            localStorage.setItem(pendingHistoryKey, JSON.stringify(pending.filter(item => !syncedIds.has(item.id))));
            setCloudStatus("Your saved practice has synced to StudySpace.");
          }
        }
        const { data, error } = await client.from("lab_practice_attempts")
          .select("id,topic,percentage,created_at,result")
          .eq("learner_id", auth.user.id)
          .eq("subject_name", subjectName.slice(0, 120))
          .eq("material_snapshot->>title", "Math Equation Studio")
          .order("created_at", { ascending: false })
          .limit(250);
        if (error || !active) return;
        const remote: StudioHistoryAttempt[] = (data ?? []).map(item => ({
          id: item.id,
          topic: ((item.result as Record<string, unknown> | null)?.topic_key as Topic) || "linear",
          correct: Number(item.percentage ?? 0) >= 100,
          created_at: item.created_at,
        }));
        setAttempts(current => {
          const merged = new Map<string, StudioHistoryAttempt>();
          current.filter(item => item.id).forEach(item => merged.set(item.id!, item));
          remote.forEach(item => merged.set(item.id!, item));
          const localOnly = current.filter(item => !item.id);
          const next = [...merged.values(), ...localOnly].slice(-250);
          try { localStorage.setItem(learnerHistoryKey, JSON.stringify(next)); } catch { /* Cloud history remains available. */ }
          return next;
        });
      } catch {
        if (active) setCloudStatus("Practice remains available offline; saved attempts will sync when possible.");
      }
    };
    void sync();
    const onOnline = () => { void sync(); };
    window.addEventListener("online", onOnline);
    return () => { active = false; window.removeEventListener("online", onOnline); };
  }, [learnerHistoryKey, pendingHistoryKey, subjectName, studentId]);
  useEffect(() => {
    if (!studentId || !supabase) return;
    let active = true;
    void supabase.from("profiles").select("education_level").eq("id", studentId).maybeSingle().then(({ data, error }) => {
      if (!active || error || !data?.education_level) return;
      const raw = String(data.education_level).trim().toLowerCase();
      const matched: Pathway | undefined = raw === "primary" ? "Primary"
        : raw === "secondary high" ? "Secondary High"
        : raw === "high school" ? "High School"
        : raw === "matric" ? "Matric"
        : ["tertiary", "university", "college", "certificate", "diploma", "bachelor", "masters", "phd"].some(value => raw.includes(value)) ? "Tertiary" : undefined;
      if (!matched) return;
      const preferredTopic: Topic = matched === "Primary" ? "arithmetic" : topic;
      const nextTopic = topics.find(item => item.id === preferredTopic && item.pathways.includes(matched))?.id ?? topics.find(item => item.pathways.includes(matched))!.id;
      setPathway(matched);
      setTopic(nextTopic);
      const generated = createProblem(nextTopic, matched, difficulty);
      setProblem(generated);
      setMethod(generated.methods[0]);
      setAnswer("");
      setChecked(false);
      setShowHint(matched === "Primary");
      setShowSteps(false);
      setStartedAt(Date.now());
    });
    return () => { active = false; };
  }, [studentId]);

  useEffect(() => {
    if (!topics.find(item => item.id === topic)?.pathways.includes(pathway)) {
      const next = topics.find(item => item.pathways.includes(pathway));
      if (next) {
        setTopic(next.id);
        const generated = createProblem(next.id, pathway, difficulty);
        setProblem(generated);
        setMethod(generated.methods[0]);
        setAnswer("");
        setChecked(false);
        setShowHint(false);
        setShowSteps(false);
        setStartedAt(Date.now());
      }
    }
  }, [pathway, topic, difficulty]);

  const availableTopics = useMemo(() => topics.filter(item => item.pathways.includes(pathway)), [pathway]);
  const total = attempts.length;
  const accuracy = total ? Math.round(attempts.filter(item => item.correct).length / total * 100) : 0;
  const weakTopic = useMemo(() => {
    const counts = new Map<Topic, { total: number; correct: number }>();
    attempts.forEach(item => { const current = counts.get(item.topic) ?? { total: 0, correct: 0 }; current.total++; if (item.correct) current.correct++; counts.set(item.topic, current); });
    return [...counts.entries()].filter(([, value]) => value.total >= 2).sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)[0]?.[0];
  }, [attempts]);
  const activeSteps = problem.methodSteps?.[method] ?? problem.steps;

  function nextProblem(nextTopic = topic) {
    const next = createProblem(nextTopic, pathway, difficulty);
    setProblem(next); setMethod(next.methods[0]); setAnswer(""); setChecked(false); setShowHint(difficulty === "guided"); setShowSteps(false); setStepIndex(0); setStartedAt(Date.now());
  }
  async function checkAnswer() {
    if (!answer.trim() || savingAttempt) return;
    const correct = answerMatches(problem, answer);
    const now = new Date().toISOString();
    const attemptId = crypto.randomUUID();
    const questionId = crypto.randomUUID();
    const topicTitle = topics.find(item => item.id === problem.topic)?.title ?? "Mathematics";
    const next = [...attempts, { id: attemptId, topic: problem.topic, correct, created_at: now }].slice(-250);
    setAttempts(next);
    try { localStorage.setItem(learnerHistoryKey, JSON.stringify(next)); } catch { /* The current session remains usable if storage is full. */ }
    setSavingAttempt(true);
    try {
      const client = supabase;
      if (!client) { setCloudStatus("Saved on this device. Cloud progress is not connected."); return; }
      const { data: sessionData, error: authError } = await client.auth.getSession();
      const learner = sessionData.session?.user;
      if (authError || !learner) { setCloudStatus("Saved on this device. Sign in again to sync progress."); return; }
      const durationSeconds = Math.max(0, Math.min(86400, Math.floor((Date.now() - startedAt) / 1000)));
      const score = correct ? 1 : 0;
      const record: PendingStudioAttempt = {
        id: attemptId,
        learner_id: learner.id,
        material_id: null,
        subject_name: subjectName.slice(0, 120),
        topic: topicTitle.slice(0, 180),
        material_snapshot: {
          title: "Math Equation Studio",
          material_type: "practice_quiz",
          subject_name: subjectName,
          topic: topicTitle,
          difficulty,
          questions: [{ id: questionId, type: "short_answer", prompt: problem.prompt, correctAnswer: problem.textAnswer ?? problem.answer.map(String), explanation: activeSteps.join("\n"), points: 1 }],
        },
        responses: { [questionId]: answer },
        result: {
          topic_key: problem.topic,
          method,
          domain: problem.domain,
          items: [{ questionId, prompt: problem.prompt, given: answer, correctAnswer: problem.textAnswer ?? problem.answer.join(", "), correct, explanation: activeSteps.join("\\n"), points: 1, earnedPoints: score }],
        },
        score,
        max_score: 1,
        percentage: correct ? 100 : 0,
        duration_seconds: durationSeconds,
        mode: "practice",
        status: "submitted",
        attempt_number: Math.max(1, attempts.filter(item => item.topic === problem.topic).length + 1),
        retake_mode: "original",
        retake_of: null,
        created_at: now,
        submitted_at: now,
      };
      const { error: saveError } = await client.from("lab_practice_attempts").upsert(record, { onConflict: "id" });
      if (saveError) {
        let pending: PendingStudioAttempt[] = [];
        try { pending = JSON.parse(localStorage.getItem(pendingHistoryKey) || "[]"); } catch { pending = []; }
        localStorage.setItem(pendingHistoryKey, JSON.stringify([...pending.filter(item => item.id !== attemptId), record]));
        setCloudStatus("Saved on this device. StudySpace will retry the cloud sync when you are online.");
      } else {
        setCloudStatus("Synced to your StudySpace progress and teacher's Monitor.");
      }
    } catch {
      setCloudStatus("Saved on this device. Cloud sync will retry when possible.");
    } finally {
      setSavingAttempt(false);
      setChecked(true);
    }
  }

  return <section className="equation-studio" aria-labelledby="equation-studio-title">
    <header className="equation-studio-header">
      <div className="equation-studio-icon"><Sigma size={25}/></div>
      <div><span className="eyebrow">ADAPTIVE MATHEMATICS WORKSPACE</span><h2 id="equation-studio-title">Math Equation Studio</h2><p>Learn the method, work through each transformation and check your solution—not just the final answer.</p></div>
    </header>
    <div className="equation-studio-stats">
      <article><strong>{total}</strong><span>Practice attempts</span></article><article><strong>{accuracy}%</strong><span>Accuracy</span></article><article><strong>{weakTopic ? topics.find(item => item.id === weakTopic)?.title : "Building"}</strong><span>Topic to revisit</span></article>
    </div>
    <div className="equation-studio-controls">
      <label>Learning pathway<select value={pathway} onChange={event => {
        const nextPathway = event.target.value as Pathway;
        const nextTopic = nextPathway === "Primary" ? "arithmetic" : topics.find(item => item.id === topic && item.pathways.includes(nextPathway))?.id ?? topics.find(item => item.pathways.includes(nextPathway))!.id;
        setPathway(nextPathway);
        setTopic(nextTopic);
        const generated = createProblem(nextTopic, nextPathway, difficulty);
        setProblem(generated);
        setMethod(generated.methods[0]);
        setAnswer("");
        setChecked(false);
        setShowHint(false);
        setShowSteps(false);
        setStartedAt(Date.now());
      }}><option>Primary</option><option>Secondary High</option><option>High School</option><option>Matric</option><option>Tertiary</option></select></label>
      <label>Equation family<select value={topic} onChange={event => { const next = event.target.value as Topic; setTopic(next); nextProblem(next); }} >{availableTopics.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <label>Practice style<select value={difficulty} onChange={event => {
        const nextDifficulty = event.target.value as typeof difficulty;
        setDifficulty(nextDifficulty);
        const generated = createProblem(topic, pathway, nextDifficulty);
        setProblem(generated);
        setMethod(generated.methods[0]);
        setAnswer("");
        setChecked(false);
        setShowHint(nextDifficulty === "guided");
        setShowSteps(false);
        setStartedAt(Date.now());
      }}><option value="guided">Guided · show hints</option><option value="independent">Independent · fewer prompts</option><option value="challenge">Challenge · solve first</option></select></label>
    </div>
    <div className="equation-studio-topic"><div><span className="eyebrow">CURRENT SKILL</span><h3>{topics.find(item => item.id === topic)?.title}</h3><p>{topics.find(item => item.id === topic)?.description}</p></div><span className="equation-studio-pathway">{pathway}</span></div>
    <div className="equation-studio-problem">
      <div className="equation-studio-problem-top"><span>YOUR QUESTION</span><button type="button" onClick={() => nextProblem()}><RefreshCw size={14}/> New variant</button></div>
      <div className="equation-studio-equation" aria-live="polite">{problem.prompt}</div>
      <p className="equation-studio-domain"><strong>Domain / restrictions:</strong> {problem.domain}</p>
      <label className="equation-studio-answer">Your solution <input value={answer} onChange={event => { setAnswer(event.target.value); setChecked(false); }} onKeyDown={event => { if (event.key === "Enter") checkAnswer(); }} placeholder={topic === "inequalities" ? "e.g. x < 4" : problem.answer.length > 1 ? "Enter all answers, separated by commas" : topic === "arithmetic" ? "Enter your numeric answer" : topic === "word-problems" ? "Enter the value of the unknown" : "Enter your value for x"}/></label>
      <div className="equation-studio-actions"><button type="button" className="equation-studio-primary" onClick={checkAnswer} disabled={!answer.trim() || checked || savingAttempt}>{savingAttempt ? "Saving…" : "Check my answer"}</button><button type="button" disabled={difficulty === "challenge" && !checked} onClick={() => setShowHint(value => !value)}><Lightbulb size={15}/> {showHint ? "Hide hint" : "Get a hint"}</button><button type="button" disabled={difficulty === "challenge" && !checked} onClick={() => { setShowSteps(value => !value); setStepIndex(0); }}><BookOpenCheck size={15}/> {showSteps ? "Hide solution" : "Work through steps"}</button></div>
      {showHint && <div className="equation-studio-hint"><Lightbulb size={16}/><span>{problem.hint}</span></div>}
      {checked && <div className={"equation-studio-feedback " + (answerMatches(problem, answer) ? "correct" : "incorrect")} role="status"><strong>{answerMatches(problem, answer) ? "Correct — well reasoned." : "Not quite. Use the hint or compare the worked method."}</strong><span>Expected solution: {problem.textAnswer ?? problem.answer.join(", ")}</span></div>}
      {showSteps && <div className="equation-studio-steps"><div className="equation-studio-steps-head"><strong>Worked solution</strong><span>Step {stepIndex + 1} of {activeSteps.length}</span></div><p>{activeSteps[stepIndex]}</p><div className="equation-studio-step-actions"><button type="button" onClick={() => setStepIndex(value => Math.max(0, value - 1))} disabled={stepIndex === 0}>Previous</button><button type="button" onClick={() => setStepIndex(value => Math.min(activeSteps.length - 1, value + 1))} disabled={stepIndex === activeSteps.length - 1}>Next step <ChevronRight size={14}/></button></div></div>}
    </div>
    <div className="equation-studio-method"><div><span className="eyebrow">METHOD SELECTION</span><h3>Choose an approach</h3><p>{guidanceForMethod(method, topic)}</p></div><div className="equation-studio-method-options">{problem.methods.map(item => <button type="button" key={item} className={method === item ? "active" : ""} onClick={() => { setMethod(item); setStepIndex(0); setShowSteps(false); }}>{item}</button>)}</div></div>
    {problem.graph && (method === "Graph both sides" || method === "Graphing") && <LabGraphSheet graph={problem.graph} />}
    {problem.numberLine && method === "Number-line solution" && <LabGraphSheet numberLine={problem.numberLine} />}
    {difficulty === "guided" && <div className="equation-studio-guidance"><Sparkles size={15}/> Guided mode is selected. Try the hint first, then reveal one worked step at a time.</div>}
    {weakTopic && <div className="equation-studio-guidance"><Activity size={15}/> Your recent practice suggests revisiting {topics.find(item => item.id === weakTopic)?.title}. Switch to that topic for a focused refresher.</div>}
    <footer className="equation-studio-footer"><CheckCircle2 size={15}/> {cloudStatus || "Practice attempts sync to your StudySpace account when online."} Teacher-assigned marks remain separate from personal Lab practice.</footer>
  </section>;
}
