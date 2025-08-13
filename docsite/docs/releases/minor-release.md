---
sidebar_label: 'Sync to a new minor release'
sidebar_position: 1
---

merges have a few gotchas.. 
1. Merging the right base commmit to branch off. You don't want to merge `0.79-stable` as that branch has commits not on `main`. Instead, you want to find the merge-base of `main` and `0.79-stable`.
2. Either (a) resolving all merge conflicts there and listing that in your notes or (b) resolving enough to make a commit with git diff markers and doing the rest as folllowup to make it easier for reviewers. 
  - I’ve tended to (a) because I dislike merge markers being in the git history 😅
3. Needing to rebase the merge commit as the base of main moves, or if you want to collapse down a bunch of follow-up fixes during review . ‘git rebase -i —rebase-merges main’ is useful here, it’ll keep the merge commit when rebasing instead of separating it out
4. when you run “got merge <commit>” and have all the merge conflicts locally, that’s a good spot to just copy/paste the output of the merge conflicts section of “git status” into your PR notes
5. GitHub chokes on these big PRs, but the vs code extension does not.