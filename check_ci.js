fetch('https://api.github.com/repos/iamnguyenvu/donghua3d-monorepo/actions/runs?per_page=3')
  .then(r => r.json())
  .then(d => {
    d.workflow_runs.forEach(r => {
      console.log(`${r.name}: ${r.status} - ${r.conclusion}`);
    });
  });
