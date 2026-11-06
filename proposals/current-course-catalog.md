# Current-course Catalog review proposal

Official source: https://omscs.gatech.edu/current-courses
Checked at: 2026-11-06T16:49:00+00:00

Review each item against its linked course page and the Registrar's catalog. This proposal does not update published Catalog facts.

| Change | Course | Published vs official source |
| --- | --- | --- |
| Added | CS 8803 O34 | New official listing; verify credits, description, and preparation before adding to Catalog. |
| Changed page fact | CS 7641 | Official course page changed: https://omscs.gatech.edu/cs-7641-machine-learning |

## CS 7641 page text change

Source: https://omscs.gatech.edu/cs-7641-machine-learning

```diff
--- previous source
+++ current source
@@ -1,13 +1,9 @@
-Instructional Team Overview This is a graduate Machine Learning Series, initially created by Charles Isbell (Chancellor, University of Illinois Urbana-Champaign) and Michael Littman (Associate Provost, Brown University) where the lectures are Socratic discussions
-The course is led by Theodore LaGrow (Georgia Tech) and has been updated with current examples, tooling, and assessments 
-Who this is for: graduate students and working professionals who want principled, hands-on mastery of modern ML
-You should be comfortable with Python, linear algebra, probability, and basic calculus
-How the pieces connect: We progress from prediction with labeled data (Supervised Learning) to discovering structure in unlabeled data (Unsupervised Learning), then to sequential decision-making under uncertainty (Reinforcement Learning)
-Artifacts from each unit feed the next
-Format and tools: Video lectures are delivered in Canvas
-Reports are written in LaTeX on Overleaf, and code lives in private Georgia Tech GitHub repos
-Course communication runs through Canvas announcements and Ed Discussions
-Each week also includes supplemental recordings on advanced topics aligned to the module
-Outcomes: You’ll leave with a portfolio of defensible analyses, models, and policies with the judgment to explain when and why to use them
-Over the term you’ll complete four reports (~30 pages) spanning supervised learning, optimization and uncertainty in learning, unsupervised learning, and reinforcement learning
+Instructional Team Overview Created and taught by Max Mahdi Roozbahani, this offering of CS 7641 begins with the mathematics and concepts behind machine learning algorithms
+We want students to understand how and why the methods work so they can connect theory with applied problem-solving
+We focus on using that understanding to apply machine learning appropriately, reason through unfamiliar problems, and develop new algorithms
+The course deliverables help students translate these concepts into solutions for real-world problems
+These foundations significantly support a deeper understanding of modern AI, including generative AI
+The course progresses through three areas: Mathematical foundations: linear algebra, probability and statistics, information theory, and optimization
+Unsupervised learning: k-means, Gaussian mixture models, hierarchical and density-based clustering, kernel density estimation, and dimensionality reduction
+Supervised learning: linear and regularized regression, logistic regression, neural and convolutional neural networks, decision trees, random forests, and support vector machines with kernels
 GT LOGIN
```

The companion `proposals/catalog-change-set.json` records proposed Catalog operations with official and published values. Verify every operation, fill facts absent from the source list, then edit `ui/lib/data/catalog.json` and the page baseline in this draft PR before merge.
