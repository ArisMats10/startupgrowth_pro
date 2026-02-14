const STATUS_NOT_COMPLETED = 'not-completed';

const getAllOutlineIds = (sections = []) => {
  const ids = [];
  for (const section of sections) {
    if (!section?.id) continue;
    ids.push(section.id);
    for (const sub of section?.subsections || []) {
      if (sub?.id) ids.push(sub.id);
    }
  }
  return ids;
};

const buildCompletionStatus = (sections = []) => {
  const status = {};
  for (const id of getAllOutlineIds(sections)) {
    status[id] = STATUS_NOT_COMPLETED;
  }
  return status;
};

const bullet = (lines = []) => lines.map(l => `• ${l}`).join('\n');

const sectionBlock = ({ heading, contextLines = [], bodyLines = [], prompts = [] }) => {
  return [
    heading,
    '',
    ...(contextLines?.length ? [`(${contextLines.join(' | ')})`, ''] : []),
    ...bodyLines,
    '',
    prompts?.length ? 'Fill in these placeholders:' : null,
    prompts?.length ? bullet(prompts) : null,
  ].filter(Boolean).join('\n');
};

const templateProfile = (template) => {
  const seed = template?.seed || {};
  const category = template?.category || '';

  // Allow template id to refine behavior even if category is shared.
  const kind = template?.id === 3 ? 'vc-tech' : category;

  return {
    id: template?.id,
    kind,
    templateName: template?.name || 'Business Plan Template',
    industry: seed?.industry || category,
    businessModel: seed?.businessModel || '',
  };
};

const basePrompts = (profile) => ([
  'Company name: [[Company Name]]',
  'One-line value proposition: [[Value Proposition]]',
  'Target customers: [[Target Customer Segment]]',
  'Problem you solve: [[Customer Problem]]',
  'Your solution: [[Product/Service]]',
  'Why now: [[Market Timing]]',
  profile?.businessModel ? `Revenue model: ${profile.businessModel}` : 'Revenue model: [[How you make money]]',
]);

const contentById = (id, profile) => {
  const kind = profile?.kind;

  // Executive Summary + subsections
  if (id === 'executive-summary') {
    if (kind === 'ecommerce') {
      return {
        body: [
          `[[Company Name]] is an e-commerce brand selling [[Product Category]] to [[Target Customer Segment]]. We compete by offering [[Differentiator: quality/design/price/speed/community]] and delivering a consistent customer experience from discovery to repeat purchase.`,
          `Our go-to-market focuses on [[Primary Channel: paid social/SEO/marketplaces/influencers]] and a retention engine built on email/SMS, loyalty, and fast fulfillment.`,
          `In the next 12 months we plan to reach [[Orders/Month]] orders/month with an AOV of [[AOV]] and gross margin of [[Gross Margin %]].`
        ],
        prompts: [...basePrompts(profile), 'AOV: [[AOV]]', 'Gross margin: [[%]]', 'Fulfillment: [[3PL / in-house]]']
      };
    }
    if (kind === 'service') {
      return {
        body: [
          `[[Company Name]] is a professional services business providing [[Service Offering]] for [[Target Customer Segment]]. We solve [[Customer Problem]] by delivering measurable outcomes such as [[Outcome Metric]].`,
          `We package our services into clear offerings (e.g., Discovery, Implementation, Ongoing Support) with transparent pricing and predictable delivery.`,
          `In the next 12 months we plan to grow to [[# Clients]] active clients with an average monthly revenue per client of [[€]] and a utilization rate of [[%]].`
        ],
        prompts: [...basePrompts(profile), 'Average monthly revenue/client: [[€]]', 'Utilization target: [[%]]', 'Delivery capacity: [[hours/week]]']
      };
    }
    if (kind === 'manufacturing') {
      return {
        body: [
          `[[Company Name]] designs and manufactures [[Product]] for [[Target Customer Segment]]. Our advantage is [[Moat: proprietary design, cost structure, quality, certifications]] and a reliable supply chain.`,
          `We will scale production from [[Current Capacity]] to [[Target Capacity]] units/month while maintaining quality standards and predictable lead times.`,
          `We expect gross margin of [[%]] driven by BOM optimization, supplier agreements, and efficient production scheduling.`
        ],
        prompts: [...basePrompts(profile), 'Current capacity: [[units/month]]', 'Target capacity: [[units/month]]', 'COGS/BOM: [[€]]', 'Lead time: [[days/weeks]]']
      };
    }
    if (kind === 'saas' || kind === 'vc-tech' || kind === 'mobile') {
      const saasAngle = kind === 'mobile'
        ? 'a mobile app'
        : 'a cloud software platform';
      return {
        body: [
          `[[Company Name]] is ${saasAngle} that helps [[Target Customer Segment]] achieve [[Outcome]] by automating [[Workflow/Task]].`,
          `We monetize via subscriptions and are focusing on fast onboarding, clear ROI, and retention. Our initial wedge is [[Use case / segment]] and we expand via [[Upsell/Cross-sell/Expansion]].`,
          `Over the next 12 months we target [[MRR]] MRR with [[Net Revenue Retention %]] NRR and churn below [[%]].`
        ],
        prompts: [...basePrompts(profile), 'MRR target: [[€]]', 'NRR: [[%]]', 'Monthly churn: [[%]]', 'CAC payback: [[months]]']
      };
    }
  }

  if (id === 'business-concept') {
    if (kind === 'ecommerce') {
      return {
        body: [
          `We sell [[Product Category]] with a focus on [[Quality/Design/Price]]. Our hero products are [[SKU 1]], [[SKU 2]], and [[SKU 3]].`,
          `We win by differentiating on [[Brand story / ingredients / sustainability / personalization]] and by offering a frictionless purchase & delivery experience.`
        ],
        prompts: ['Hero SKUs: [[List]]', 'Return policy: [[days]]', 'Fulfillment approach: [[3PL/in-house]]']
      };
    }
    if (kind === 'service') {
      return {
        body: [
          `Our core offerings are packaged into three tiers to match client needs and budgets. We deliver through a repeatable process that reduces delivery risk and improves client outcomes.`,
          `We use templates, playbooks, and tooling to maintain quality as we scale.`
        ],
        prompts: ['Packages (3 tiers): [[Names + price ranges]]', 'Delivery process: [[Steps]]']
      };
    }
    if (kind === 'manufacturing') {
      return {
        body: [
          `We develop [[Product]] with specifications optimized for [[Use case]]. Production is designed for repeatability and compliance (where needed).`,
          `We source materials from [[Supplier Region]] and use [[Manufacturing Method]] to hit cost and quality targets.`
        ],
        prompts: ['Manufacturing method: [[Injection molding/CNC/etc.]]', 'Certifications: [[CE/ISO/etc.]]']
      };
    }
    // SaaS / Mobile / VC
    return {
      body: [
        `The product delivers value in three steps: onboarding → automation/configuration → measurable outcomes.`,
        `Primary workflows supported: [[Workflow 1]], [[Workflow 2]], [[Workflow 3]].`
      ],
      prompts: ['Product wedge: [[Initial use case]]', 'Integrations: [[Tools/APIs]]']
    };
  }

  if (id === 'market-opportunity') {
    if (kind === 'ecommerce') {
      return {
        body: [
          `The market is growing due to [[Trend]]. Customers increasingly buy [[Category]] online because [[Reason]].`,
          `Our beachhead is [[Geography]] with a focus on [[Demographic/Psychographic]]. We expand by adding adjacent categories and increasing repeat purchase.`
        ],
        prompts: ['Market size (TAM/SAM/SOM): [[Numbers + sources]]', 'Seasonality considerations: [[Yes/No + details]]']
      };
    }
    if (kind === 'service') {
      return {
        body: [
          `Demand for [[Service Offering]] is driven by [[Regulation/Technology/Cost pressure]]. Many clients lack in-house expertise and prefer flexible external partners.`,
          `We target organizations with [[Trigger event]] and budgets of [[€ range]].`
        ],
        prompts: ['Ideal client profile: [[Industry + size + trigger]]', 'Sales cycle length: [[weeks]]']
      };
    }
    if (kind === 'manufacturing') {
      return {
        body: [
          `The opportunity exists because buyers need [[Requirement]] and current suppliers fail on [[Lead time/quality/cost]].`,
          `We start with a focused SKU set and expand via variants, private label, and new distribution channels.`
        ],
        prompts: ['Target channels: [[Distributors/Direct/Online]]', 'Expected lead time advantage: [[% or days]]']
      };
    }
    return {
      body: [
        `The market is expanding due to [[Trend]] and increased willingness to adopt software/mobile solutions.`,
        `Our initial target segment is [[Segment]] where the ROI is easiest to prove and adoption friction is low.`
      ],
      prompts: ['TAM/SAM/SOM: [[Numbers + sources]]', 'Buying stakeholders: [[User/Champion/Economic buyer]]']
    };
  }

  if (id === 'competitive-advantage') {
    if (kind === 'ecommerce') {
      return {
        body: [
          `We differentiate on brand positioning, product quality, and customer experience. Our moat compounds through reviews, UGC, and repeat customers.`,
          `Operationally, we win by optimizing CAC through creative testing and by improving LTV via retention and upsells.`
        ],
        prompts: ['Top 3 differentiators: [[List]]', 'Retention lever: [[Loyalty/email/SMS]]']
      };
    }
    if (kind === 'service') {
      return {
        body: [
          `Our advantage is speed-to-value and a repeatable delivery methodology. We provide senior expertise with clear scope and measurable outcomes.`,
          `We also build reusable assets (templates, automations, training) that improve margins over time.`
        ],
        prompts: ['Delivery methodology name: [[Name]]', 'Proof points: [[Case studies / metrics]]']
      };
    }
    if (kind === 'manufacturing') {
      return {
        body: [
          `We win through superior cost/quality balance and dependable lead times. Our supplier network and QA process reduce variability and returns.`,
          `Where possible, we protect the advantage via design/IP, tooling ownership, and certifications.`
        ],
        prompts: ['QA checks: [[List]]', 'Certifications/IP: [[List]]']
      };
    }
    return {
      body: [
        `Our competitive advantage comes from faster time-to-value, deep workflow understanding, and product-led adoption.`,
        `We build defensibility via data/network effects, integrations, and high switching costs once embedded in daily operations.`
      ],
      prompts: ['Key integration partners: [[List]]', 'Switching costs: [[Explain]]']
    };
  }

  if (id === 'financial-summary') {
    if (kind === 'ecommerce') {
      return {
        body: [
          `Unit economics focus on contribution margin: AOV × gross margin − fulfillment − payment fees − returns − marketing spend.`,
          `Targets: CAC [[€]]; LTV [[€]]; LTV:CAC [[x]]; payback in [[months]].`
        ],
        prompts: ['AOV: [[€]]', 'Gross margin: [[%]]', 'Return rate: [[%]]', 'CAC: [[€]]', 'LTV: [[€]]']
      };
    }
    if (kind === 'service') {
      return {
        body: [
          `Revenue is driven by billable hours, retainers, and packaged engagements. Margin improves as utilization increases and delivery becomes standardized.`,
          `Targets: average project size [[€]]; gross margin [[%]]; utilization [[%]]; cash runway [[months]].`
        ],
        prompts: ['Avg project size: [[€]]', 'Utilization: [[%]]', 'Gross margin: [[%]]', 'Pipeline coverage: [[months]]']
      };
    }
    if (kind === 'manufacturing') {
      return {
        body: [
          `Key drivers are BOM/COGS, yield, capacity utilization, and inventory turns. We manage working capital via supplier terms and demand forecasting.`,
          `Targets: gross margin [[%]]; yield [[%]]; inventory turns [[x]]; lead time [[days]].`
        ],
        prompts: ['BOM/COGS: [[€]]', 'Yield: [[%]]', 'Inventory turns: [[x]]', 'Working capital needs: [[€]]']
      };
    }
    return {
      body: [
        `We track SaaS/mobile metrics: MRR/ARR, gross margin, churn, CAC, LTV, and net revenue retention.`,
        `Targets: MRR [[€]]; gross margin [[%]]; churn [[%]]; CAC payback [[months]].`
      ],
      prompts: ['MRR: [[€]]', 'Gross margin: [[%]]', 'Churn: [[%]]', 'CAC payback: [[months]]', 'LTV:CAC: [[x]]']
    };
  }

  // Company Description + subsections
  if (id === 'company-description') {
    return {
      body: [
        `[[Company Name]] was founded in [[Year]] to solve [[Customer Problem]] for [[Target Customer Segment]].`,
        `We operate as a [[Legal Structure]] based in [[Location]]. Our near-term focus is shipping a great product/service and building a repeatable growth engine.`
      ],
      prompts: ['Mission: [[Mission]]', 'Vision: [[Vision]]', 'Legal structure: [[LLC/SA/etc.]]', 'Location: [[City, Country]]']
    };
  }
  if (id === 'company-overview') {
    return {
      body: [
        `We are building a company designed around customer outcomes, operational excellence, and sustainable unit economics.`,
        `Core KPIs we monitor: [[KPI 1]], [[KPI 2]], [[KPI 3]].`
      ],
      prompts: ['Founded: [[Year]]', 'Stage: [[Idea/MVP/Revenue]]', 'Core KPI: [[KPI]]']
    };
  }
  if (id === 'mission-vision') {
    return {
      body: [
        `Mission: [[One sentence mission]].`,
        `Vision: [[One sentence vision]].`,
        `Values: [[Value 1]], [[Value 2]], [[Value 3]].`
      ],
      prompts: ['Mission: [[...]]', 'Vision: [[...]]', 'Values: [[...]]']
    };
  }
  if (id === 'company-history') {
    return {
      body: [
        `Key milestones so far include: customer discovery, MVP build, first pilots, and early iteration based on feedback.`,
        `Next milestones: [[Milestone 1]], [[Milestone 2]], [[Milestone 3]].`
      ],
      prompts: ['Milestones achieved: [[List]]', 'Upcoming milestones: [[List]]']
    };
  }
  if (id === 'legal-structure') {
    return {
      body: [
        `We will operate under a legal structure appropriate for fundraising/contracts and for limiting liability.`,
        `Ownership will be allocated among founders and (optionally) an employee option pool.`
      ],
      prompts: ['Entity type: [[LLC/SA/etc.]]', 'Ownership split: [[%/%/%]]', 'IP assignment: [[Yes/No]]']
    };
  }

  // Market Analysis + subsections
  if (id === 'market-analysis') {
    const extra = kind === 'ecommerce'
      ? 'We evaluate customer demand, competitive pricing, and channel economics (CAC vs LTV) across paid, organic, and marketplace channels.'
      : kind === 'service'
        ? 'We analyze client pain points, budget cycles, and decision makers to target accounts with the highest urgency and ability to pay.'
        : kind === 'manufacturing'
          ? 'We analyze demand drivers, incumbent suppliers, and distribution channels to ensure we can win on cost, quality, and reliability.'
          : 'We analyze market size, segmentation, and buying processes to position the product for a clear wedge and expansion path.';

    return {
      body: [
        extra,
        `Primary assumptions: [[Assumption 1]], [[Assumption 2]], [[Assumption 3]].`
      ],
      prompts: ['TAM/SAM/SOM: [[Numbers + sources]]', 'Competitor list: [[A/B/C]]', 'Customer interview count: [[#]]']
    };
  }
  if (id === 'industry-overview') {
    return {
      body: [
        `Industry dynamics: [[Growth drivers]], [[Regulatory/technology trends]], and [[customer behavior changes]].`,
        `Key trends supporting our entry: [[Trend 1]], [[Trend 2]].`
      ],
      prompts: ['CAGR: [[%]]', 'Key trend: [[...]]', 'Sources: [[Links]]']
    };
  }
  if (id === 'target-market') {
    return {
      body: [
        `Our ideal customer profile (ICP) is [[ICP Description]]. We prioritize segments with high pain, clear willingness-to-pay, and short sales cycles.`,
        `Personas: [[Primary user]], [[Buyer]], [[Influencer]].`
      ],
      prompts: ['ICP: [[Industry + size + trigger]]', 'Primary persona: [[Role]]', 'Buying trigger: [[Event]]']
    };
  }
  if (id === 'market-size') {
    return {
      body: [
        `We estimate market size using a bottom-up approach (number of target accounts × expected spend) and validate with top-down reports.`,
        `TAM: [[€]]; SAM: [[€]]; SOM (3-year): [[€]].`
      ],
      prompts: ['TAM: [[€]]', 'SAM: [[€]]', 'SOM: [[€]]', 'Methodology: [[Top-down/Bottom-up]]']
    };
  }
  if (id === 'competitive-analysis') {
    return {
      body: [
        `Competitors fall into three buckets: (1) direct tools, (2) adjacent solutions, and (3) status quo/manual processes.`,
        `Our positioning: we win for [[Segment]] by offering [[Differentiator]] with [[Proof point]].`
      ],
      prompts: ['Competitor A: [[Strength/Weakness]]', 'Competitor B: [[Strength/Weakness]]', 'Our differentiator: [[...]]']
    };
  }

  // Organization & Management + subsections
  if (id === 'organization') {
    const note = kind === 'vc-tech'
      ? 'We are building a venture-scale team with strong product, engineering, and go-to-market leadership.'
      : 'We are building a lean team focused on execution, customer outcomes, and efficient growth.';
    return {
      body: [
        note,
        `We define clear ownership across product, sales/marketing, operations, and finance. Governance is handled via regular reviews and KPI tracking.`
      ],
      prompts: ['Founder roles: [[Name - Role]]', 'Key hires (12 months): [[Roles]]', 'Advisors: [[Names]]']
    };
  }
  if (id === 'organizational-structure') {
    return {
      body: [
        `Structure for the next 12 months: Founder-led functions with clear owners, supported by contractors/part-time specialists as needed.`,
        `As we scale, we formalize teams around Product, Growth, and Operations.`
      ],
      prompts: ['Org chart (now): [[...]]', 'Org chart (12 months): [[...]]']
    };
  }
  if (id === 'management-team') {
    return {
      body: [
        `The founding team combines domain expertise and execution experience. Each leader owns a set of measurable outcomes.`,
        `Gaps we plan to hire for: [[Gap 1]], [[Gap 2]].`
      ],
      prompts: ['Founder 1 bio: [[...]]', 'Founder 2 bio: [[...]]', 'Key gap: [[Role]]']
    };
  }
  if (id === 'advisory-board') {
    return {
      body: [
        `We will form a small advisory board to accelerate learning in industry, go-to-market, and fundraising/operations.`,
        `Advisors are compensated via small equity grants tied to clear contributions.`
      ],
      prompts: ['Advisor 1: [[Name + expertise]]', 'Advisor 2: [[Name + expertise]]']
    };
  }
  if (id === 'personnel-plan') {
    return {
      body: [
        `Hiring is staged to match traction: first fill the biggest constraint (product delivery or growth), then add support roles as volume increases.`,
        `We use contractors initially to keep burn low and convert roles to full-time when ROI is clear.`
      ],
      prompts: ['Hire timeline: [[Months + roles]]', 'Estimated monthly burn: [[€]]']
    };
  }

  // Products & Services + subsections
  if (id === 'products-services') {
    const productNote = kind === 'ecommerce'
      ? 'Our product line is curated to maximize contribution margin and repeat purchase through bundles, replenishment, and seasonal drops.'
      : kind === 'service'
        ? 'Our services are packaged for clarity and repeatability, reducing scope creep and improving delivery margins.'
        : kind === 'manufacturing'
          ? 'Our products are engineered for manufacturability and quality, with documented specs and QA procedures.'
          : 'Our product is built to deliver fast time-to-value with minimal onboarding friction.';

    return {
      body: [
        productNote,
        `We prioritize a clear value proposition, measurable benefits, and a roadmap informed by customer feedback.`
      ],
      prompts: ['Core offering: [[...]]', 'Top features/benefits: [[...]]', 'Roadmap (next 6 months): [[...]]']
    };
  }
  if (id === 'product-overview') {
    return {
      body: [
        `Overview: [[Product/Service]] enables customers to [[Outcome]] by [[How]].`,
        `Primary use cases: [[Use case 1]], [[Use case 2]], [[Use case 3]].`
      ],
      prompts: ['Use case 1: [[...]]', 'Use case 2: [[...]]', 'Use case 3: [[...]]']
    };
  }
  if (id === 'features-benefits') {
    return {
      body: [
        `Key features map to clear benefits. We avoid “feature bloat” and focus on what drives adoption and retention.`,
        `Top benefits: [[Benefit 1]], [[Benefit 2]], [[Benefit 3]].`
      ],
      prompts: ['Feature → Benefit mapping: [[...]]', 'Customer ROI: [[Time saved / € saved]]']
    };
  }
  if (id === 'development-roadmap') {
    const roadmap = kind === 'manufacturing'
      ? ['Finalize design + tooling', 'Pilot run + QA validation', 'Ramp production + distribution expansion']
      : kind === 'ecommerce'
        ? ['Launch hero SKU(s)', 'Improve conversion + retention', 'Expand catalog + partnerships']
        : kind === 'service'
          ? ['Package offerings', 'Build delivery playbooks', 'Scale acquisition + hire delivery team']
          : ['MVP → beta → v1', 'Improve onboarding + activation', 'Add integrations + expand segment'];

    return {
      body: [
        `Roadmap focuses on de-risking the biggest unknowns first, then scaling what works.`,
        ...roadmap.map((r, i) => `${i + 1}. ${r}`)
      ],
      prompts: ['Next milestone date: [[Date]]', 'Key risk: [[...]]', 'Mitigation: [[...]]']
    };
  }
  if (id === 'intellectual-property') {
    const ip = kind === 'manufacturing'
      ? 'We protect the product via design ownership, tooling control, supplier agreements, and (where appropriate) patents.'
      : kind === 'saas' || kind === 'vc-tech' || kind === 'mobile'
        ? 'We protect the product through proprietary workflows, data/integrations, and continuous iteration; optionally through trademarks/patents.'
        : 'We protect the brand and delivery assets via trademarks, templates, and proprietary processes.';

    return {
      body: [ip],
      prompts: ['Trademarks: [[...]]', 'Patents (if any): [[...]]', 'Data moat: [[...]]']
    };
  }

  // Marketing & Sales Strategy + subsections
  if (id === 'marketing-sales-strategy') {
    const gtm = kind === 'ecommerce'
      ? 'We optimize a funnel from paid/organic discovery to conversion, then retention via email/SMS and repeat purchase mechanics (bundles, subscriptions, loyalty).'
      : kind === 'service'
        ? 'We generate leads via referrals, content, partnerships, and outbound to ICP accounts; we sell through consultative calls and clear proposals.'
        : kind === 'manufacturing'
          ? 'We sell through distributors/partners and targeted direct outreach, supported by trade shows, certifications, and proof of reliability.'
          : 'We combine product-led growth with targeted outbound/partnerships; we measure activation, retention, and expansion.';

    return {
      body: [gtm],
      prompts: ['Primary channels: [[...]]', 'Sales cycle: [[...]]', 'Pricing model: [[...]]']
    };
  }
  if (id === 'marketing-strategy') {
    return {
      body: [
        `We choose channels where we can test quickly and measure CAC and conversion rates. We iterate weekly on creative, messaging, and landing pages.`,
        `Content themes: [[Theme 1]], [[Theme 2]], [[Theme 3]].`
      ],
      prompts: ['Top channel: [[...]]', 'Conversion rate target: [[%]]', 'Content theme: [[...]]']
    };
  }
  if (id === 'sales-strategy') {
    const sales = kind === 'ecommerce'
      ? 'Sales is primarily self-serve online with support for customer service and post-purchase experience.'
      : 'Sales uses a clear pipeline: lead → qualification → demo/proposal → close → onboarding.';
    return {
      body: [sales],
      prompts: ['Lead qualification criteria: [[...]]', 'Sales collateral: [[Deck/case studies]]']
    };
  }
  if (id === 'pricing-model') {
    const pricing = kind === 'saas' || kind === 'vc-tech' || kind === 'mobile'
      ? 'Pricing is tiered by value (seats/usage/features) and designed to align with customer ROI. We keep onboarding simple with a clear starter plan.'
      : kind === 'ecommerce'
        ? 'Pricing balances competitiveness with healthy gross margins; we use bundles and upsells to increase AOV.'
        : kind === 'service'
          ? 'Pricing uses packaged tiers and retainers to reduce variability; scope is controlled via clear deliverables.'
          : 'Pricing is based on unit costs, target margin, and channel requirements.';
    return {
      body: [pricing],
      prompts: ['Price point(s): [[...]]', 'Discount policy: [[...]]', 'Margins: [[...]]']
    };
  }
  if (id === 'customer-acquisition') {
    const acq = kind === 'ecommerce'
      ? 'Acquisition focuses on creative testing, influencers/UGC, SEO for intent, and marketplace expansion where economics are favorable.'
      : kind === 'service'
        ? 'Acquisition focuses on referrals, partnerships, and outbound to ICP accounts with a strong offer and proof points.'
        : 'Acquisition focuses on activation and retention first, then scaling channels with predictable CAC.';
    return {
      body: [acq],
      prompts: ['CAC target: [[€]]', 'Top channel: [[...]]', 'Activation metric: [[...]]']
    };
  }

  // Financial Projections + subsections
  if (id === 'financial-projections') {
    const fp = kind === 'ecommerce'
      ? 'Forecasts focus on traffic, conversion rate, AOV, gross margin, and retention/repurchase rate. We track contribution margin per order and CAC payback.'
      : kind === 'service'
        ? 'Forecasts focus on pipeline, close rate, average deal size, and delivery capacity (billable hours/utilization).'
        : kind === 'manufacturing'
          ? 'Forecasts focus on capacity, yield, COGS/BOM, inventory turns, and working capital requirements.'
          : 'Forecasts focus on MRR/ARR, churn, CAC, LTV, and net revenue retention.';

    return {
      body: [
        fp,
        `We present a base case and a conservative case with key assumptions clearly stated.`
      ],
      prompts: ['3-year revenue forecast: [[...]]', 'Key assumptions: [[...]]', 'Gross margin: [[%]]']
    };
  }
  if (id === 'revenue-model') {
    return {
      body: [
        `Revenue streams: [[Stream 1]], [[Stream 2]] (optional). We aim to maximize margin and predictability while keeping customer value high.`
      ],
      prompts: ['Primary revenue stream: [[...]]', 'Upsells: [[...]]', 'Renewals/repeat: [[...]]']
    };
  }
  if (id === 'financial-forecasts') {
    return {
      body: [
        `Forecast assumptions include growth rate, pricing, churn/retention (if applicable), and operating costs.`,
        `We track monthly cash balance to ensure sufficient runway.`
      ],
      prompts: ['Monthly growth rate: [[%]]', 'Operating expenses: [[€]]', 'Runway: [[months]]']
    };
  }
  if (id === 'break-even-analysis') {
    return {
      body: [
        `Break-even occurs when contribution margin covers fixed costs. We outline the required volume (customers/orders/projects/units) to reach break-even.`,
        `Key levers: pricing, gross margin, CAC, and operating efficiency.`
      ],
      prompts: ['Fixed costs/month: [[€]]', 'Contribution margin/unit: [[€]]', 'Break-even volume: [[#]]']
    };
  }
  if (id === 'key-metrics') {
    const km = kind === 'ecommerce'
      ? ['Sessions', 'Conversion rate', 'AOV', 'Gross margin', 'Return rate', 'CAC', 'Repeat purchase rate']
      : kind === 'service'
        ? ['Pipeline value', 'Close rate', 'Avg deal size', 'Utilization', 'Gross margin', 'Cash runway']
        : kind === 'manufacturing'
          ? ['Capacity utilization', 'Yield', 'COGS', 'Gross margin', 'Inventory turns', 'Lead time']
          : ['MRR/ARR', 'Churn', 'NRR', 'CAC', 'LTV', 'Gross margin', 'Activation/Retention'];
    return {
      body: [
        `We track the following metrics weekly/monthly to manage performance:`,
        ...km.map(m => `- ${m}`)
      ],
      prompts: ['Current metric values: [[...]]', 'Targets (12 months): [[...]]']
    };
  }

  // Funding Requirements + subsections
  if (id === 'funding-requirements') {
    const fund = kind === 'vc-tech'
      ? 'We are seeking venture funding to accelerate product development and go-to-market, aiming for rapid growth and category leadership.'
      : 'We will fund initial growth through a mix of revenue, bootstrapping, and (optionally) external capital as needed.';
    return {
      body: [
        fund,
        `Funds will be allocated to the highest-ROI activities and tracked against milestones.`
      ],
      prompts: ['Amount needed: [[€]]', 'Runway created: [[months]]', 'Primary milestone: [[...]]']
    };
  }
  if (id === 'funding-needs') {
    return {
      body: [
        `We are raising [[€ amount]] to reach [[Milestone]] and validate [[Key assumption]].`,
        `This provides runway of approximately [[months]] months under the base case.`
      ],
      prompts: ['Raise amount: [[€]]', 'Milestone: [[...]]', 'Runway: [[months]]']
    };
  }
  if (id === 'use-of-funds') {
    return {
      body: [
        `Use of funds (example):`,
        `- Product/engineering: [[%]]`,
        `- Marketing & sales: [[%]]`,
        `- Operations & tooling: [[%]]`,
        `- Working capital: [[%]]`
      ],
      prompts: ['Product/engineering %: [[...]]', 'Marketing & sales %: [[...]]', 'Ops/working capital %: [[...]]']
    };
  }
  if (id === 'exit-strategy') {
    const exit = kind === 'vc-tech'
      ? 'Potential outcomes include acquisition by a strategic buyer, consolidation in the space, or (less likely) an IPO depending on scale.'
      : 'We focus on building a sustainable company; potential outcomes include long-term profitability, acquisition, or owner-managed growth.';
    return {
      body: [exit],
      prompts: ['Potential acquirers: [[...]]', 'Strategic rationale: [[...]]']
    };
  }
  if (id === 'roi-projections') {
    return {
      body: [
        `We outline potential investor returns based on valuation scenarios tied to revenue and margin outcomes.`,
        `We include conservative, base, and upside cases.`
      ],
      prompts: ['Base case revenue (Year 3): [[€]]', 'Exit multiple assumption: [[x]]', 'Implied valuation: [[€]]']
    };
  }

  // Default for any other/unrecognized ids
  return {
    body: [
      `[[Write this section in your own words.]] Use the prompts below to get started and add concrete numbers where possible.`
    ],
    prompts: basePrompts(profile)
  };
};

export const buildBusinessPlanTemplateData = (template, outlineSections = []) => {
  const profile = templateProfile(template);
  const businessPlanData = {};

  for (const section of outlineSections) {
    if (!section?.id) continue;

    businessPlanData[section.id] = {
      title: section.title,
      description: section.description,
      content: sectionBlock({
        heading: section.title,
        contextLines: [
          `Template: ${profile.templateName}`,
          profile.industry ? `Industry: ${profile.industry}` : null,
          profile.businessModel ? `Business model: ${profile.businessModel}` : null,
        ].filter(Boolean),
        bodyLines: contentById(section.id, profile).body,
        prompts: contentById(section.id, profile).prompts,
      }),
      aiSuggestions: [],
    };

    for (const sub of section?.subsections || []) {
      if (!sub?.id) continue;

      businessPlanData[sub.id] = {
        title: sub.title,
        description: section.description,
        content: sectionBlock({
          heading: `${section.title} — ${sub.title}`,
          contextLines: [
            `Template: ${profile.templateName}`,
            profile.industry ? `Industry: ${profile.industry}` : null,
            profile.businessModel ? `Business model: ${profile.businessModel}` : null,
          ].filter(Boolean),
          bodyLines: contentById(sub.id, profile).body,
          prompts: contentById(sub.id, profile).prompts,
        }),
        aiSuggestions: [],
      };
    }
  }

  return {
    businessPlanData,
    completionStatus: buildCompletionStatus(outlineSections),
  };
};
