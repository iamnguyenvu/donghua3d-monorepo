fetch('https://api.github.com/repos/iamnguyenvu/donghua3d-monorepo/actions/runs?per_page=3', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  }
})
  .then(r => r.json())
  .then(d => {
    if (!d.workflow_runs) {
      console.log('Error/Rate limited:', d);
      return;
    }
    d.workflow_runs.forEach(r => {
      console.log(`${r.name}: ${r.status} - ${r.conclusion}`);
    });
  });
